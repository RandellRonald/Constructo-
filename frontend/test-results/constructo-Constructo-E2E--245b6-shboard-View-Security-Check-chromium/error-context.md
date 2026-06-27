# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: constructo.spec.ts >> Constructo E2E Production Booking Flow >> Admin Dashboard View Security Check
- Location: tests\constructo.spec.ts:298:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - link "Back to Home" [ref=e5] [cursor=pointer]:
    - /url: /
    - img [ref=e6]
    - text: Back to Home
  - generic [ref=e8]:
    - generic [ref=e9]:
      - img [ref=e11]
      - generic [ref=e15]:
        - generic [ref=e16]: Constructo
        - text: Admin Panel
    - heading "Admin Sign In" [level=1] [ref=e17]
    - paragraph [ref=e18]: Access the platform management controls
    - generic [ref=e19]: Invalid credentials
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: Username or Email
        - generic [ref=e23]:
          - img [ref=e24]
          - textbox "admin@constructo.in" [ref=e27]: admin@test.com
      - generic [ref=e28]:
        - generic [ref=e29]: Password
        - generic [ref=e30]:
          - img [ref=e31]
          - textbox "••••••••" [ref=e34]: Password@123
          - button [ref=e35]:
            - img [ref=e36]
      - button "Sign In to Panel" [ref=e39]
```