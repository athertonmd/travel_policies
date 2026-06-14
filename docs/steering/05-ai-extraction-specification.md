# AI Extraction Specification

## Purpose

Defines how travel policies are converted from unstructured documents into structured policy data.

This specification is the authoritative source for all policy extraction logic.

---

# Extraction Pipeline

Document Upload

↓

Textract OCR

↓

Text Normalisation

↓

Policy Chunking

↓

Bedrock Extraction

↓

Structured JSON

↓

Confidence Scoring

↓

Human Review

↓

Publication

---

# AI Model

Provider:

Amazon Bedrock

Primary Model:

Claude Sonnet

Temperature:

0.1

Output Format:

Strict JSON

No free-text output permitted.

---

# Policy Categories

The platform shall support the following categories.

## Air

### AIR_001
Lowest Logical Fare

### AIR_002
Advance Purchase Days

### AIR_003
Economy Mandatory Domestic

### AIR_004
Economy Mandatory International

### AIR_005
Premium Economy Allowed

### AIR_006
Premium Economy Threshold Hours

### AIR_007
Business Class Allowed

### AIR_008
Business Class Threshold Hours

### AIR_009
First Class Allowed

### AIR_010
Executive Exception

### AIR_011
Preferred Airlines

### AIR_012
Excluded Airlines

### AIR_013
Approval Required

### AIR_014
International Approval Required

### AIR_015
Traveller Grade Exceptions

---

## Hotel

### HOTEL_001
Maximum Nightly Rate

### HOTEL_002
Country Specific Rate Caps

### HOTEL_003
City Specific Rate Caps

### HOTEL_004
Preferred Chains

### HOTEL_005
Preferred Hotels

### HOTEL_006
Attachment Required

### HOTEL_007
Luxury Hotel Restriction

### HOTEL_008
Extended Stay Rules

### HOTEL_009
Approval Required

### HOTEL_010
Executive Exception

### HOTEL_011
Project Exception

### HOTEL_012
Long Stay Exception

### HOTEL_013
Minimum Star Rating

---

## Rail

### RAIL_001
Standard Class Required

### RAIL_002
First Class Allowed

### RAIL_003
First Class Threshold Hours

### RAIL_004
Preferred Operators

### RAIL_005
Approval Required

### RAIL_006
Executive Exception

---

## Car

### CAR_001
Allowed Vehicle Category

### CAR_002
Preferred Suppliers

### CAR_003
Insurance Requirements

### CAR_004
Approval Required

### CAR_005
Electric Vehicle Preference

### CAR_006
Executive Exception

---

## General

### GEN_001
Travel Approval Required

### GEN_002
Manager Approval Threshold

### GEN_003
Executive Traveller Definition

### GEN_004
Project Traveller Definition

### GEN_005
Traveller Grade Definitions

### GEN_006
Regional Exceptions

### GEN_007
Country Exceptions

### GEN_008
Policy Effective Date

### GEN_009
Policy Expiry Date

### GEN_010
Policy Owner

---

# Confidence Scoring

Each extracted rule shall receive:

- confidence score
- source reference
- extraction timestamp

Confidence Bands:

95-100 = High

80-94 = Medium

Below 80 = Low

---

# Source Referencing

Every extracted rule must include:

- page number
- paragraph reference
- extracted text snippet

Example:

{
  "page": 14,
  "paragraph": "3.2",
  "sourceText": "Business class may be booked on flights exceeding eight hours."
}

---

# Correction Learning

Reviewer corrections shall be stored.

Corrections become available to future extraction prompts through the enterprise knowledge base.

The original AI extraction shall never be overwritten.

---

# Extraction Output Schema

{
  "enterpriseId": "",
  "policyVersion": "",
  "effectiveDate": "",
  "air": {},
  "hotel": {},
  "rail": {},
  "car": {},
  "general": {}
}

Schema must remain backwards compatible.