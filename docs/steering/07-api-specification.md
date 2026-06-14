# API Specification

## Purpose

Defines all externally available APIs.

The API is the primary integration mechanism for downstream systems.

---

# Authentication

Authentication:

OAuth2

Provider:

Amazon Cognito

Bearer Token Required

---

# API Versioning

Version Prefix:

/api/v1/

Future breaking changes require:

/api/v2/

---

# Get Current Policy

GET

/api/v1/enterprises/{enterpriseId}/policy/current

Response:

{
  "enterpriseId": "",
  "version": "",
  "policy": {}
}

---

# Get Policy Version

GET

/api/v1/enterprises/{enterpriseId}/policy/version/{version}

Response:

{
  "enterpriseId": "",
  "version": "",
  "policy": {}
}

---

# Get Policy Versions

GET

/api/v1/enterprises/{enterpriseId}/policy/versions

Response:

[
  {
    "version": "1"
  },
  {
    "version": "2"
  }
]

---

# Get Policy Changes

GET

/api/v1/enterprises/{enterpriseId}/policy/changes

Parameters:

- fromVersion
- toVersion

Response:

[
  {
    "ruleType": "BusinessClassThreshold",
    "oldValue": 8,
    "newValue": 6,
    "changeType": "Modified"
  }
]

---

# Get Policy Metadata

GET

/api/v1/enterprises/{enterpriseId}/policy/metadata

Response:

{
  "effectiveDate": "",
  "approvedDate": "",
  "approvedBy": ""
}

---

# Search Knowledge Base

GET

/api/v1/enterprises/{enterpriseId}/knowledge/search

Parameters:

- query

Response:

{
  "results": []
}

---

# Export Policy

GET

/api/v1/enterprises/{enterpriseId}/policy/export

Formats:

- json

Response:

application/json

---

# Error Model

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

500 Internal Server Error

---

# Pagination Standard

{
  "page": 1,
  "pageSize": 50,
  "totalRecords": 100,
  "data": []
}

---

# Multi-Tenant Rules

A user may only access enterprises belonging to their tenant.

System Administrators may access all tenants.

All requests must be tenant scoped.

---

# API Performance Targets

95th Percentile Response Time:

Less than 2 seconds

Availability:

99.9%

Rate Limit:

1000 requests per minute per tenant