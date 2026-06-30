import logging
import os
from datetime import datetime
from backend.app.core.config import settings

# Configure logging to write to SMS delivery log
logger = logging.getLogger("sms_service")
logger.setLevel(logging.INFO)

# Avoid adding multiple handlers if import happens multiple times
if not logger.handlers:
    log_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "sms_delivery.log"))
    file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

async def send_sms_advisory(to_number: str, message: str) -> bool:
    """
    Sends an SMS notification to the farmer's mobile number.
    Falls back to writing to logs if Twilio is not configured.
    """
    if not to_number:
        logger.warning("No phone number provided. SMS aborted.")
        return False

    # Check if Twilio settings are configured
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=message,
                from_=settings.TWILIO_FROM_NUMBER,
                to=to_number
            )
            logger.info(f"SMS successfully dispatched via Twilio to {to_number}: '{message}'")
            return True
        except Exception as e:
            logger.error(f"Twilio execution failed: {str(e)}. Falling back to file logger.")
            
    # Fallback logger
    logger.info(f"[SIMULATED SMS] Destination: {to_number} | Message: {message}")
    print(f"\n--- SMS OUTGOING ---\nTo: {to_number}\nMessage: {message}\n--------------------\n")
    return True
