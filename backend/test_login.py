import requests
reg_data = {
    'name': 'Test Provider',
    'email': 'prov9@example.com',
    'phone': '9999999999',
    'password': 'Password123!',
    'confirm_password': 'Password123!',
    'role': 'provider',
    'business_name': 'My Biz',
    'district': 'Ernakulam',
    'service_categories': '[\"earthmoving\"]'
}
res = requests.post('http://localhost:8000/api/v1/auth/register', json=reg_data)
print('Register:', res.status_code, res.text)

login_data = {
    'identifier': 'prov9@example.com',
    'password': 'Password123!',
    'device_name': 'web'
}
res2 = requests.post('http://localhost:8000/api/v1/auth/login', json=login_data)
print('Login:', res2.status_code, res2.text)
