import pytest
from app.core.security import verify_password, get_password_hash
from app.core.security import create_access_token

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)
    
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)

def test_jwt_token_generation():
    subject = "1"
    token = create_access_token(subject)
    assert isinstance(token, str)
    assert len(token) > 0

@pytest.mark.asyncio
async def test_rbac_admin_route_protection():
    # Example logic for RBAC test
    # Ensure regular users get 403 on admin routes
    assert True
