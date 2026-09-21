"""
Test script to verify candidate email validation is working
"""
import asyncio
import httpx

BASE_URL = "http://localhost:8000/api"

async def test_email_validation():
    async with httpx.AsyncClient() as client:
        print("=" * 60)
        print("Testing Candidate Email Validation")
        print("=" * 60)
        print()
        
        # Test 1: Try to login with any email/token (should fail if no session)
        print("Test 1: Login with invalid token...")
        try:
            response = await client.post(
                f"{BASE_URL}/auth/candidate/login",
                json={
                    "email": "test@example.com",
                    "access_token": "FAKE-1234-TOKEN-5678"
                }
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")
        
        print()
        print("-" * 60)
        print()
        
        # Instructions for manual testing
        print("Manual Testing Steps:")
        print()
        print("1. Create a new interview session with candidate_email:")
        print("   POST /api/sessions")
        print("   {")
        print('     "title": "Test Interview",')
        print('     "candidate_name": "John Doe",')
        print('     "candidate_email": "john@example.com"  <-- Set this!')
        print("   }")
        print()
        print("2. Copy the access_token from the response")
        print()
        print("3. Try logging in with WRONG email:")
        print("   POST /api/auth/candidate/login")
        print("   {")
        print('     "email": "wrong@example.com",')
        print('     "access_token": "<your_token>"')
        print("   }")
        print("   Expected: 403 error - email doesn't match")
        print()
        print("4. Try logging in with CORRECT email:")
        print("   POST /api/auth/candidate/login")
        print("   {")
        print('     "email": "john@example.com",')
        print('     "access_token": "<your_token>"')
        print("   }")
        print("   Expected: 200 success - returns JWT token")
        print()
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_email_validation())
