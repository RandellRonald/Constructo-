Feature: Customer Booking
  In order to get construction equipment
  As a customer
  I want to create a booking and have a provider assigned

  Scenario: Customer creates a booking successfully
    Given a customer is logged in
    When the customer creates a booking
    Then the booking should be stored
    And a provider search should begin
