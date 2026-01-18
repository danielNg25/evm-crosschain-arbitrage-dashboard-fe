# API Testing Guide for Arbitrage Bot Dashboard

This guide provides example requests and expected responses for testing the dashboard against your backend API.

## Prerequisites

- Backend API running at `http://localhost:8001`
- API Key header required for mutations: `X-API-Key: your-secret-api-key`

## Base URL

```
http://localhost:8001
```

## Networks Endpoints

### List All Networks
```http
GET /networks
Authorization: None
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "chain_id": 1,
    "name": "Ethereum",
    "rpcs": ["https://eth-rpc.example.com"],
    "websocket_urls": ["wss://eth-ws.example.com"],
    "block_explorer": "https://etherscan.io",
    "wrap_native": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "min_profit_usd": 100.50,
    "v2_factory_to_fee": {"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f": 3000},
    "aero_factory_addresses": [],
    "multicall_address": "0x5ba1e12693dc8f9c48aad8770482f4739beed696",
    "max_blocks_per_batch": 100,
    "wait_time_fetch": 1000,
    "created_at": 1704067200,
    "updated_at": 1704153600,
    "deleted_at": null
  }
]
```

### Get Network by Chain ID
```http
GET /networks/1
Authorization: None
```

**Expected Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "chain_id": 1,
  "name": "Ethereum",
  ...
}
```

### Create Network
```http
POST /networks
X-API-Key: your-secret-api-key
Content-Type: application/json

{
  "chain_id": 137,
  "name": "Polygon",
  "rpcs": ["https://polygon-rpc.com"],
  "websocket_urls": ["wss://polygon-ws.com"],
  "block_explorer": "https://polygonscan.com",
  "wrap_native": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  "min_profit_usd": 50.0,
  "multicall_address": "0xcA11bde05977b3631167028862bE2a173976CA11",
  "max_blocks_per_batch": 50,
  "wait_time_fetch": 2000
}
```

**Expected Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "chain_id": 137,
  "name": "Polygon",
  "created_at": 1704240000,
  "updated_at": 1704240000,
  ...
}
```

### Update Network
```http
PUT /networks/137
X-API-Key: your-secret-api-key
Content-Type: application/json

{
  "min_profit_usd": 75.0,
  "wait_time_fetch": 1500
}
```

**Expected Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "chain_id": 137,
  "name": "Polygon",
  "min_profit_usd": 75.0,
  "wait_time_fetch": 1500,
  "updated_at": 1704326400,
  ...
}
```

### Delete Network
```http
DELETE /networks/137
X-API-Key: your-secret-api-key
```

**Expected Response (200 OK):**
```json
{
  "message": "Network deleted successfully"
}
```

## Paths Endpoints

### List All Paths
```http
GET /paths
Authorization: None
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "507f1f77bcf86cd799439013",
    "paths": [
      {
        "chain_id": 1,
        "anchor_token": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "paths": [
          {
            "pool": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
            "token_in": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            "token_out": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
          }
        ]
      }
    ],
    "created_at": 1704067200,
    "updated_at": 1704153600
  }
]
```

### Create Path
```http
POST /paths
X-API-Key: your-secret-api-key
Content-Type: application/json

{
  "paths": [
    {
      "chain_id": 1,
      "anchor_token": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      "paths": [
        {
          "pool": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
          "token_in": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          "token_out": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
        }
      ]
    }
  ]
}
```

**Expected Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439014",
  "paths": [...],
  "created_at": 1704412800,
  "updated_at": 1704412800
}
```

## Pools Endpoints

### List All Pools
```http
GET /pools
Authorization: None
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "507f1f77bcf86cd799439015",
    "network_id": 1,
    "address": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    "created_at": 1704067200,
    "updated_at": 1704153600
  }
]
```

### Get Pools by Network
```http
GET /pools/network/1
Authorization: None
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "507f1f77bcf86cd799439015",
    "network_id": 1,
    "address": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    ...
  }
]
```

### Get Pool Count by Network
```http
GET /pools/network/1/count
Authorization: None
```

**Expected Response (200 OK):**
```json
{
  "count": 42,
  "network_id": 1
}
```

### Create Pool
```http
POST /pools
X-API-Key: your-secret-api-key
Content-Type: application/json

{
  "network_id": 1,
  "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
}
```

**Expected Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439016",
  "network_id": 1,
  "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "created_at": 1704412800,
  "updated_at": 1704412800
}
```

## Configuration Endpoints

### Get Configuration
```http
GET /config
Authorization: None
```

**Expected Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439017",
  "max_amount_usd": 10000,
  "recheck_interval": 5000,
  "created_at": 1704067200,
  "updated_at": 1704153600
}
```

### Update Configuration
```http
PUT /config
X-API-Key: your-secret-api-key
Content-Type: application/json

{
  "max_amount_usd": 15000,
  "recheck_interval": 3000
}
```

**Expected Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439017",
  "max_amount_usd": 15000,
  "recheck_interval": 3000,
  "updated_at": 1704499200
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid network configuration",
  "message": "Chain ID is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication failed",
  "message": "Invalid or missing API key"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Network with chain_id 999 not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error",
  "message": "An unexpected error occurred"
}
```

## Testing with cURL

### Create a Network
```bash
curl -X POST http://localhost:8001/networks \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "chain_id": 1,
    "name": "Ethereum",
    "rpcs": ["https://eth-rpc.example.com"],
    "wrap_native": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "min_profit_usd": 100,
    "max_blocks_per_batch": 100,
    "wait_time_fetch": 1000
  }'
```

### List Networks
```bash
curl -X GET http://localhost:8001/networks
```

### Update Network
```bash
curl -X PUT http://localhost:8001/networks/1 \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "min_profit_usd": 150
  }'
```

### Delete Network
```bash
curl -X DELETE http://localhost:8001/networks/1 \
  -H "X-API-Key: your-secret-api-key"
```

## Testing the Dashboard

1. **Start the backend API** on `http://localhost:8001`
2. **Run the dashboard** with `pnpm dev`
3. **Test each page:**
   - Dashboard: Verify metrics load from API
   - Networks: Test create, read, update, delete operations
   - Paths: Test path creation and filtering
   - Pools: Test pool management by network
   - Config: Test configuration viewing and updating

## Common Issues

### CORS Errors
Ensure your backend API has proper CORS headers configured:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, X-API-Key
```

### API Key Not Included
Ensure the `X-API-Key` header is set in your environment:
```
VITE_API_KEY=your-secret-api-key
```

### Network Errors
Check that:
- Backend is running on correct port (8001)
- API base URL is correct in environment variables
- Network connectivity between frontend and backend

### Data Not Loading
Check browser console for detailed error messages and verify:
- API endpoints are returning correct data format
- Response status codes are 200/201
- No validation errors in request payload
