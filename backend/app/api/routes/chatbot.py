from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from backend.app.db.session import get_db
from backend.app.models.models import Field, User, SatelliteObservation
from backend.app.schemas.schemas import ChatRequest, ChatResponse
from backend.app.api.routes.auth import get_current_user

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Multilingual response templates for realism
KNOWLEDGE_BASE = {
    "water": {
        "en": "Based on my AI models, we look at Sentinel-2 NDWI (moisture index) and forecast rainfall. If rainfall is expected, we advise delaying irrigation to save up to 25% water. Select a field to see exact mm requirements.",
        "hi": "हमारे एआई मॉडल आपके खेत की मिट्टी की नमी (NDWI) और मौसम विभाग की बारिश की भविष्यवाणी का विश्लेषण करते हैं। यदि बारिश होने वाली है, तो हम पानी बचाने के लिए सिंचाई को टालने की सलाह देते हैं। सटीक मात्रा देखने के लिए अपना खेत चुनें।",
        "or": "ଆମର ଏଆଇ ମଡେଲ୍ ଆପଣଙ୍କ ଜମିର ଆଦ୍ରତା (NDWI) ଏବଂ ବର୍ଷା ପୂର୍ବାନୁମାନକୁ ବିଶ୍ଳେଷଣ କରେ। ଯଦି ବର୍ଷା ସମ୍ଭାବନା ଥାଏ, ଆମେ ସେଚନ ବିଳମ୍ବ କରି ୨୫% ପର୍ଯ୍ୟନ୍ତ ଜଳ ସଞ୍ଚୟ କରିବାକୁ ପରାମର୍ଶ ଦେଉ। ସଠିକ୍ ପରିମାଣ ପାଇଁ ଜମି ଚୟନ କରନ୍ତୁ।"
    },
    "yellow": {
        "en": "Yellow leaves typically indicate Nitrogen deficiency or moisture stress. Our satellite timeline tracks your field's NDVI (health curve). If your crop is Paddy and humidity is high, check the 'Disease Risk' panel for Rice Blast Fungus alerts.",
        "hi": "पत्तियों का पीला पड़ना आमतौर पर नाइट्रोजन की कमी या पानी के तनाव को दर्शाता है। हमारे उपग्रह चित्र आपके खेत के NDVI (फसल स्वास्थ्य) पर नज़र रखते हैं। यदि धान की फसल है और नमी अधिक है, तो 'रोग जोखिम' पैनल में ब्लास्ट फंगस की जांच करें।",
        "or": "ପତ୍ର ହଳଦିଆ ହେବା ସାଧାରଣତଃ ଯବକ୍ଷାରଜାନର ଅଭାବ କିମ୍ବା ଜଳ ଅଭାବକୁ ସୂଚାଏ। ଆମର ସାଟେଲାଇଟ୍ ଟାଇମଲାଇନ୍ ଆପଣଙ୍କ ଜମିର NDVI (ଫସଲ ସ୍ୱାସ୍ଥ୍ୟ) ଉପରେ ନଜର ରଖେ। ଯଦି ଧାନ ଫସଲ ହୋଇଥାଏ ଏବଂ ଆଦ୍ରତା ଅଧିକ ଥାଏ, ତେବେ 'ରୋଗ ଆଶଙ୍କା' ପ୍ୟାନେଲ୍ ଦେଖନ୍ତୁ।"
    },
    "disease": {
        "en": "High humidity (>80%) combined with moderate temperatures triggers fungal warnings. For Paddy, watch out for Rice Blast. For Wheat, monitor lower leaves for Stripe Rust. We recommend organic neem spray or targeted fungicides like Tricyclazole.",
        "hi": "उच्च आर्द्रता (>80%) और मध्यम तापमान से फंगल संक्रमण का खतरा बढ़ता है। धान के लिए 'राइस ब्लास्ट' और गेहूं के लिए 'स्ट्राइप रस्ट' का ध्यान रखें। शुरुआती लक्षणों पर नीम के तेल का छिड़काव करें या ट्राइसाइक्लाजोल जैसे अनुशंसित कवकनाशी का उपयोग करें।",
        "or": "ଅଧିକ ଆଦ୍ରତା (>୮୦%) ଏବଂ ମଧ୍ୟମ ତାପମାତ୍ରା ଯୋଗୁଁ କବକ ଜନିତ ରୋଗ ଆଶଙ୍କା ବୃଦ୍ଧି ପାଏ। ଧାନ ପାଇଁ 'ବ୍ଲାଷ୍ଟ ରୋଗ' ଏବଂ ଗହମ ପାଇଁ 'ହଳଦିଆ କଳଙ୍କୀ ରୋଗ' ପ୍ରତି ସତର୍କ ରୁହନ୍ତୁ। ନିମ୍ବ ତେଲ କିମ୍ବା ଟ୍ରାଇସାଇକ୍ଲାଜୋଲ୍ ଭଳି କବକନାଶକ ସ୍ପ୍ରେ କରନ୍ତୁ।"
    },
    "yield": {
        "en": "Yield prediction is calculated using cumulative NDVI values across the vegetative stages. Currently, your predicted yield scales with your crop vigor. High vigor leads to peak outputs (e.g. up to 5.8 tons/hectare for Paddy).",
        "hi": "उपज की भविष्यवाणी वानस्पतिक चरणों में संचयी NDVI मूल्यों का उपयोग करके की जाती है। वर्तमान में, आपकी अनुमानित उपज आपकी फसल के स्वास्थ्य के अनुसार बदलती है। अच्छा स्वास्थ्य अधिकतम पैदावार देता है (जैसे धान के लिए 5.8 टन/हेक्टेयर तक)।",
        "or": "ଫସଲ ବୃଦ୍ଧି ସମୟର ସାମଗ୍ରିକ NDVI ମୂଲ୍ୟକୁ ଆଧାର କରି ଅମଳ ପୂର୍ବାନୁମାନ କରାଯାଏ। ବର୍ତ୍ତମାନ ଆପଣଙ୍କ ଫସଲର ସ୍ୱାସ୍ଥ୍ୟ ଅନୁଯାୟୀ ଆନୁମାନିକ ଅମଳ ନିରୂପଣ କରାଯାଉଛି (ଉଦାହରଣ ସ୍ୱରୂପ ଧାନ ପାଇଁ ହେକ୍ଟର ପିଛା ୫.୮ ଟନ୍ ପର୍ଯ୍ୟନ୍ତ)।"
    },
    "greeting": {
        "en": "Hello! I am your KrishiSaarthi assistant. I can help explain: \n1. Recommended watering volume and rainfall adjustments\n2. Leaf yellowing or health drops\n3. Disease preventative actions\n4. Projected crop yields",
        "hi": "नमस्ते! मैं आपका कृषिसारथी सहायक हूँ। मैं निम्नलिखित विषयों में आपकी मदद कर सकता हूँ:\n1. सिंचाई की अनुशंसित मात्रा और वर्षा के प्रभाव\n2. पत्तियों के पीले पड़ने या फसल स्वास्थ्य में गिरावट\n3. रोगों से बचाव के उपाय\n4. अनुमानित पैदावार/उपज की जानकारी",
        "or": "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ କୃଷିସାରଥୀ ସହାୟକ। ମୁଁ ନିମ୍ନଲିଖିତ ବିଷୟରେ ସାହାଯ୍ୟ କରିପାରିବି:\n୧. ସେଚନର ପରିମାଣ ଏବଂ ବର୍ଷାର ପ୍ରଭାବ\n୨. ପତ୍ର ହଳଦିଆ ପଡ଼ିବା କିମ୍ବା ଫସଲ ସ୍ୱାସ୍ଥ୍ୟ ହ୍ରାସ\n୩. ରୋଗ ପ୍ରତିରୋଧକ ଉପାୟ\n୪. ଆନୁମାନିକ ଫସଲ ଅମଳ"
    }
}

@router.post("", response_model=ChatResponse)
async def ask_chatbot(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    msg = request.message.lower()
    
    # Determine target language
    lang = request.language or current_user.language or "en"
    if lang not in ["en", "hi", "or"]:
        lang = "en"
        
    # Match keyword
    matched_key = "greeting"
    if any(k in msg for k in ["water", "irrigate", "irrigation", "rain", "पानी", "सिंचाई", "बारिश", "ସେଚନ", "ପାଣି", "ବର୍ଷା"]):
        matched_key = "water"
    elif any(k in msg for k in ["yellow", "pustule", "dry", "पीला", "सूखा", "ହଳଦିଆ", "ଶୁଖିଲା"]):
        matched_key = "yellow"
    elif any(k in msg for k in ["disease", "fungus", "blast", "rust", "remedy", "बीमारी", "रोग", "फंगस", "ରୋଗ", "କବକ"]):
        matched_key = "disease"
    elif any(k in msg for k in ["yield", "harvest", "ton", "predict", "पैदावार", "उपज", "ଅମଳ", "କେତେ"]):
        matched_key = "yield"
        
    # Retrieve contextual information if field_id is provided
    context_prefix = ""
    if request.field_id:
        stmt = select(Field).where(Field.id == request.field_id)
        result = await db.execute(stmt)
        field = result.scalar_one_or_none()
        if field:
            if lang == "hi":
                context_prefix = f"[खेत: {field.name} ({field.crop_type}) का विश्लेषण किया जा रहा है] "
            elif lang == "or":
                context_prefix = f"[ଜମି: {field.name} ({field.crop_type}) ବିଶ୍ଳେଷଣ କରାଯାଉଛି] "
            else:
                context_prefix = f"[Analyzing field: {field.name} ({field.crop_type})] "

    response_text = context_prefix + KNOWLEDGE_BASE[matched_key][lang]
    return {"response": response_text, "language": lang}
