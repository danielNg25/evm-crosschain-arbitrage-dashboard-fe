# Quick Start Guide - Arbitrage Bot Dashboard

Get up and running in 5 minutes!

## 1️⃣ Install Dependencies
```bash
pnpm install
```

## 2️⃣ Configure Backend URL (Optional)

If your backend is NOT at `http://localhost:8001`, create a `.env.local` file:

```bash
# .env.local
VITE_API_BASE_URL=http://your-backend-url:8001
VITE_API_KEY=your-api-key
```

## 3️⃣ Start the App

```bash
pnpm dev
```

The dashboard will open at **http://localhost:8080**

## 4️⃣ Navigate the Dashboard

### 📊 Dashboard
See real-time metrics:
- Total networks, paths, pools
- Configuration summary
- Network breakdown table

**URL**: `/dashboard`

### 🔗 Networks
Manage blockchain networks:
- List all networks
- Create new network (button: "+ Add Network")
- Edit network (click edit icon)
- Delete network (click delete icon)
- Search by name or chain ID

**URL**: `/networks`

### 🗺️ Paths
Configure arbitrage paths:
- List all paths
- Create path with multi-chain support
- View pool directions in expanded rows
- Filter by anchor token or chain

**URL**: `/paths`

### 💧 Pools
Manage liquidity pools:
- List all pools across networks
- Filter by network or address
- Create/edit/delete pools
- See pool count per network

**URL**: `/pools`

### ⚙️ Config
Global trading settings:
- View current configuration
- Edit max trade amount and recheck interval
- Toggle between view/edit modes

**URL**: `/config`

## 🎯 Common Tasks

### Add a New Network
1. Navigate to `/networks`
2. Click "+ Add Network"
3. Fill in network details:
   - Chain ID (e.g., 1 for Ethereum)
   - Network name
   - RPC URLs (add multiple)
   - Wrap native token address
   - Min profit threshold
4. Click "Save Network"

### Create an Arbitrage Path
1. Go to `/paths`
2. Click "+ Add Path"
3. Select chain ID and anchor token
4. Add pool directions (via API)
5. Save

### Add a Pool
1. Navigate to `/pools`
2. Click "+ Add Pool"
3. Select network
4. Enter pool address
5. Click "Save Pool"

### Update Global Config
1. Go to `/config`
2. Click "Edit Settings"
3. Change values:
   - Max Trade Amount (USD)
   - Recheck Interval (ms)
4. Click "Save Changes"

## 🔌 API Backend Requirements

Your backend API needs these endpoints:

### Essential Endpoints
- `GET /networks` - List networks
- `POST /networks` - Create network
- `PUT /networks/{chainId}` - Update network
- `DELETE /networks/{chainId}` - Delete network
- `GET /paths` - List paths
- `POST /paths` - Create path
- `PUT /paths/{id}` - Update path
- `DELETE /paths/{id}` - Delete path
- `GET /pools` - List pools
- `POST /pools` - Create pool
- `PUT /pools/{id}` - Update pool
- `DELETE /pools/{id}` - Delete pool
- `GET /config` - Get config
- `PUT /config` - Update config

### Required Headers
- For GET requests: No auth needed
- For POST/PUT/DELETE: `X-API-Key: your-api-key` header required

Full API documentation: See `/API_TESTING_GUIDE.md`

## 🐛 Troubleshooting

### "Cannot connect to API"
1. Ensure backend is running on `http://localhost:8001`
2. Check `VITE_API_BASE_URL` in `.env.local`
3. Verify CORS headers are configured on backend

### "API Key Error"
1. Set `VITE_API_KEY` in `.env.local`
2. Default key: `your-secret-api-key`
3. Ensure key matches your backend configuration

### "Data not loading"
1. Open browser console (F12)
2. Check Network tab for failed requests
3. Verify API response format matches expected data types
4. See `/IMPLEMENTATION_SUMMARY.md` for type definitions

### "Forms not submitting"
1. Check console for validation errors
2. Ensure all required fields are filled
3. Verify API key is set correctly
4. Check backend error response

## 📖 Full Documentation

- **Setup & Features**: Read `/DASHBOARD_README.md`
- **API Reference**: See `/API_TESTING_GUIDE.md`
- **Implementation Details**: Check `/IMPLEMENTATION_SUMMARY.md`

## 🎮 Example Workflow

```
1. Start backend API on port 8001
2. pnpm dev
3. Navigate to /dashboard
4. Go to /networks
5. Create a test network
6. Go to /config
7. Update trading settings
8. Go to /pools
9. Add a pool to the network
10. View metrics on dashboard
```

## 🚀 Production Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Deploy to hosting (Netlify, Vercel, etc.)
# See DASHBOARD_README.md for cloud deployment options
```

## 💡 Tips & Tricks

- **Search**: Use the search bars on Networks, Paths, and Pools pages
- **Expand Rows**: Click the chevron icon to see detailed information
- **Mobile**: The sidebar collapses on mobile - use hamburger menu
- **Dark Mode**: Available if configured in Tailwind settings
- **Keyboard**: Use Tab to navigate forms, Enter to submit

## 🆘 Need Help?

1. Check the `/DASHBOARD_README.md` for detailed documentation
2. Review `/API_TESTING_GUIDE.md` for API examples
3. Verify backend is running and accessible
4. Check browser console for error messages
5. Ensure environment variables are configured

## ✅ You're Ready!

Start exploring the dashboard and managing your arbitrage bot operations! 🚀
