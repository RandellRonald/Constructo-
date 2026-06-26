# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: constructo.spec.ts >> Constructo E2E Production Booking Flow >> Complete Customer-Provider Booking Life Cycle
- Location: tests\constructo.spec.ts:30:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - button [ref=e6]:
      - img [ref=e7]
    - generic [ref=e9]:
      - paragraph [ref=e10]: Live Tracking
      - paragraph [ref=e11]: "Booking #1"
    - button [ref=e12]:
      - img [ref=e13]
  - generic [ref=e15]:
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]:
          - generic:
            - button "Keyboard shortcuts"
          - region "Map" [ref=e19]
          - generic [ref=e20]:
            - img "Your Location" [ref=e50] [cursor=pointer]
            - iframe [ref=e51]:
              
            - link "Open this area in Google Maps (opens a new window)" [ref=e53] [cursor=pointer]:
              - /url: https://maps.google.com/maps?ll=9.9816,76.2999&z=14&t=m&hl=en-US&gl=US&mapclient=apiv3
              - img "Google" [ref=e55]
            - generic [ref=e56]:
              - button "Keyboard shortcuts" [ref=e62] [cursor=pointer]
              - generic [ref=e67]: Map data ©2026
              - link "Terms (opens in new tab)" [ref=e72] [cursor=pointer]:
                - /url: https://www.google.com/intl/en-US_US/help/terms_maps.html
                - text: Terms
              - link "Report a map error (opens in new tab)" [ref=e77] [cursor=pointer]:
                - /url: https://www.google.com/maps/@9.9816,76.2999,14z/data=!10m1!1e1!12b1?source=apiv3&rapsrc=apiv3
                - text: Report a map error
        - generic [ref=e78]:
          - generic [ref=e80]: This page can't load Google Maps correctly.
          - table [ref=e81]:
            - row "Do you own this website? OK" [ref=e82]:
              - cell "Do you own this website?" [ref=e83]:
                - link "Do you own this website?" [ref=e84] [cursor=pointer]:
                  - /url: http://g.co/dev/maps-no-account
              - cell "OK" [ref=e85]:
                - button "OK" [ref=e86] [cursor=pointer]
      - generic [ref=e87]:
        - generic [ref=e88]:
          - paragraph [ref=e89]: Estimated Arrival
          - paragraph [ref=e90]: 12 min
        - generic [ref=e91]:
          - paragraph [ref=e92]: Distance Remaining
          - paragraph [ref=e93]: 3.2 km
    - generic [ref=e94]:
      - img [ref=e95]
      - paragraph [ref=e97]: Secure Job Verification Code
      - paragraph [ref=e98]: "689237"
      - paragraph [ref=e99]: Give this PIN code to the provider once they arrive at your site.
    - generic [ref=e100]:
      - heading "Site Progress Status" [level=3] [ref=e101]
      - generic [ref=e102]:
        - generic [ref=e103]:
          - img [ref=e106]
          - paragraph [ref=e110]: Booking Created
        - generic [ref=e111]:
          - img [ref=e114]
          - paragraph [ref=e119]: Provider Assigned
        - generic [ref=e120]:
          - img [ref=e123]
          - paragraph [ref=e127]: Provider En Route
        - generic [ref=e128]:
          - img [ref=e131]
          - paragraph [ref=e136]: Provider Arrived
        - generic [ref=e137]:
          - img [ref=e140]
          - paragraph [ref=e144]: Verified
        - generic [ref=e145]:
          - img [ref=e148]
          - paragraph [ref=e153]: Work In Progress
        - generic [ref=e154]:
          - img [ref=e157]
          - paragraph [ref=e160]: Completed
    - button "Cancel or Dispute Booking" [ref=e161]
```