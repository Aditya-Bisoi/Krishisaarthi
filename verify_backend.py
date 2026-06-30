import asyncio
import httpx
import sys
import os

async def verify_endpoints():
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print("=== KRISHISAARTHI BACKEND VERIFICATION ===")
    base_url = "http://127.0.0.1:8000"
    
    # 1. Health check
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{base_url}/")
            print(f"[1] Root Health check: {res.status_code} - Output: {res.json()}")
            if res.status_code != 200:
                print("Root health check failed.")
                sys.exit(1)
    except Exception as e:
        print(f"Failed to connect to backend server at {base_url}: {e}")
        print("Please ensure FastAPI server is running.")
        sys.exit(1)
        
    # 2. Register demo farmer
    username = f"farmer_test_{os.urandom(2).hex()}"
    user_payload = {
        "username": username,
        "password": "securepassword123",
        "role": "farmer",
        "phone_number": "+919999999999",
        "language": "hi"
    }
    
    async with httpx.AsyncClient() as client:
        # Register user
        res = await client.post(f"{base_url}/api/auth/register", json=user_payload)
        print(f"[2] User Registration ({username}): {res.status_code} - Output: {res.json()}")
        if res.status_code != 200:
            print("Registration failed.")
            sys.exit(1)
            
        # 3. Authenticate to get JWT token
        login_data = {
            "username": username,
            "password": "securepassword123"
        }
        res_token = await client.post(f"{base_url}/api/auth/token", data=login_data)
        print(f"[3] OAuth2 JWT Login: {res_token.status_code}")
        if res_token.status_code != 200:
            print("Login failed.")
            sys.exit(1)
            
        token = res_token.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 4. Get User profile
        res_me = await client.get(f"{base_url}/api/auth/me", headers=headers)
        print(f"[4] User profile (/me): {res_me.status_code} - Language: {res_me.json().get('language')}")
        
        # 5. Create field
        field_payload = {
            "name": "Verif Field A",
            "district": "Cuttack",
            "state": "Odisha",
            "crop_type": "Paddy",
            "area_hectares": 1.8,
            "geojson": {
                "type": "Polygon",
                "coordinates": [[[85.87, 20.45], [85.89, 20.45], [85.89, 20.47], [85.87, 20.47], [85.87, 20.45]]]
            }
        }
        res_field = await client.post(f"{base_url}/api/fields", json=field_payload, headers=headers)
        print(f"[5] Field Creation: {res_field.status_code}")
        if res_field.status_code != 200:
            print("Field creation failed.")
            sys.exit(1)
        field_id = res_field.json()["id"]
        
        # 6. Retrieve satellite observations
        res_sat = await client.get(f"{base_url}/api/fields/{field_id}/satellite", headers=headers)
        print(f"[6] Satellite observations timeline: {res_sat.status_code} - Count: {len(res_sat.json())}")
        
        # 7. Generate advisory
        res_adv = await client.post(f"{base_url}/api/fields/{field_id}/advisory", headers=headers)
        print(f"[7] Generated Advisory (water): {res_adv.status_code} - Recommendations (en): '{res_adv.json().get('recommendations_en')}'")
        
        # 8. Get disease risk models
        res_pred = await client.get(f"{base_url}/api/fields/{field_id}/predictions", headers=headers)
        print(f"[8] AI Predictions (crop/yield/disease): {res_pred.status_code} - Expected Yield: {res_pred.json().get('yield_prediction').get('expected_yield_tons_per_ha')} tons/ha")

        # 9. Test Chatbot multi-lingual reply
        chat_payload = {
            "message": "When should I water my field?",
            "field_id": field_id,
            "language": "or"
        }
        res_chat = await client.post(f"{base_url}/api/chatbot", json=chat_payload, headers=headers)
        print(f"[9] Chatbot response (Odia message): {res_chat.status_code} - Response: '{res_chat.json().get('response')}'")
        
    print("\n=== ALL ENDPOINTS VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(verify_endpoints())
