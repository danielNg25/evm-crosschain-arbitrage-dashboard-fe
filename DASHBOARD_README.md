# Arbitrage Bot Dashboard

A production-ready single-page application for managing blockchain arbitrage bot operations, networks, trading paths, and liquidity pools.

## 📋 Features

- **Dashboard**: Real-time metrics overview with network summary
- **Networks Management**: Full CRUD operations for blockchain networks with detailed configurations
- **Paths Management**: Configure and manage arbitrage paths across multiple chains
- **Pools Management**: Track and organize liquidity pools by network
- **Config Management**: Global trading parameters (max amount, recheck interval)
- **Responsive Design**: Mobile-friendly layout with collapsible sidebar
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Skeleton loaders and spinners during data fetches

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 3
- **HTTP Client**: Axios
- **State Management**: React Query + Custom Hooks
- **UI Components**: Radix UI + Lucide Icons
- **Routing**: React Router 6 (SPA)

## 📁 Project Structure

```
client/
├── api/
│   ├── client.ts          # Axios instance with interceptors
│   └── endpoints.ts       # API endpoint definitions
├── components/
│   ├── layout/
│   │   └── NavLayout.tsx  # Shared layout with sidebar
│   └── forms/
│       ├── NetworkForm.tsx
│       ├── PathForm.tsx
│       └── PoolForm.tsx
├── hooks/
│   └── useApi.ts          # Generic API hooks
├── pages/
│   ├── Dashboard.tsx
│   ├── Networks.tsx
│   ├── Paths.tsx
│   ├── Pools.tsx
│   ├── Config.tsx
│   └── NotFound.tsx
├── utils/
│   └── formatters.ts      # Date, currency, address formatting
├── App.tsx                # Main app with routing
└── global.css             # Global styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables (optional):
```bash
cp .env.example .env.local
```

3. Configure the API base URL in `.env.local`:
```
VITE_API_BASE_URL=http://localhost:8001
VITE_API_KEY=your-secret-api-key
```

### Development

Start the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:8080`

### Build

Create a production build:
```bash
pnpm build
```

Start production server:
```bash
pnpm start
```

## 📡 API Integration

### Base Configuration

- **Base URL**: `http://localhost:8001` (configurable via `VITE_API_BASE_URL`)
- **Authentication**: `X-API-Key` header for mutations (POST, PUT, DELETE)
- **Default API Key**: `your-secret-api-key` (configurable via `VITE_API_KEY`)

### Endpoints

#### Networks
- `GET /networks` - List all networks
- `GET /networks/{chainId}` - Get network details
- `POST /networks` - Create network
- `PUT /networks/{chainId}` - Update network
- `DELETE /networks/{chainId}` - Delete network
- `PUT /networks/{chainId}/factories` - Update factories

#### Paths
- `GET /paths` - List all paths
- `GET /paths/{id}` - Get path details
- `GET /paths/anchor-token/{anchorToken}` - Filter by anchor token
- `GET /paths/chain/{chainId}` - Filter by chain
- `POST /paths` - Create path
- `PUT /paths/{id}` - Update path
- `DELETE /paths/{id}` - Delete path

#### Pools
- `GET /pools` - List all pools
- `GET /pools/network/{networkId}` - Filter by network
- `GET /pools/network/{networkId}/count` - Count pools in network
- `GET /pools/network/{networkId}/address/{address}` - Find pool by address
- `POST /pools` - Create pool
- `PUT /pools/{id}` - Update pool
- `DELETE /pools/{id}` - Delete pool

#### Config
- `GET /config` - Get configuration
- `PUT /config` - Update configuration

## 🎨 UI Components

### Forms
- **NetworkForm**: Create/edit networks with RPC management
- **PathForm**: Configure chain paths and anchor tokens
- **PoolForm**: Add pools with network selection

### Layouts
- **NavLayout**: Main layout with sidebar, header, and content area
- Responsive mobile menu with hamburger toggle

### Tables & Lists
- Sortable data tables with hover effects
- Expandable rows for additional details
- Inline search and filtering
- Delete confirmation dialogs

## 📊 Data Models

### Network
- Chain ID, name, RPC URLs
- Min profit threshold, token configurations
- Factory addresses and multicall settings
- Block batch settings

### Path
- Multiple chain paths per configuration
- Anchor token per chain
- Pool directions and routing details

### Pool
- Network association
- Pool address tracking
- Timestamps

### Config
- Max trade amount (USD)
- Recheck interval (ms)
- Global settings

## 🔧 Custom Hooks

### useApi
Generic hook for data fetching with loading/error states:
```typescript
const { data, loading, error, refetch } = useApi(
  () => networksApi.getAll(),
  true // immediate fetch
);
```

### useMutation
Hook for API mutations (create, update, delete):
```typescript
const { mutate, loading, error } = useMutation(
  (data) => networksApi.create(data)
);
```

## 🎯 Usage Examples

### Fetch Networks
```typescript
import { networksApi } from '@/api/endpoints';

const networks = await networksApi.getAll();
```

### Create Network
```typescript
const newNetwork = await networksApi.create({
  chain_id: 1,
  name: 'Ethereum',
  rpcs: ['https://eth-rpc.example.com'],
  // ... other fields
});
```

### Format Data
```typescript
import { formatDate, formatUSD, truncateAddress } from '@/utils/formatters';

formatDate(network.created_at);        // Nov 15, 2024, 02:30 PM
formatUSD(100.50);                      // $100.50
truncateAddress('0xabc...xyz', 4);      // 0xab...xyz
```

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8001` | Backend API URL |
| `VITE_API_KEY` | `your-secret-api-key` | API authentication key |

## 🐛 Debugging

### Enable Verbose Logging
```typescript
// In client/api/client.ts
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('API Response:', response);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

### Check Network Requests
Open browser DevTools (F12) and navigate to the Network tab to inspect API calls.

## 📦 Dependencies

See `package.json` for complete list. Key dependencies:
- `react` - UI framework
- `react-router-dom` - Client-side routing
- `axios` - HTTP client
- `tailwindcss` - Utility CSS
- `radix-ui` - UI components
- `lucide-react` - Icons
- `@tanstack/react-query` - State management

## 🚦 Performance Tips

1. **Lazy Loading**: Routes are automatically lazy-loaded via React Router
2. **Memoization**: Use React.memo for expensive components
3. **Pagination**: Implement client-side pagination for large datasets
4. **Caching**: React Query handles cache management automatically

## 🔒 Security Notes

- API keys are environment variables (never hardcoded)
- X-API-Key header is only sent for mutation requests
- All inputs are properly escaped in JSX
- CORS headers should be configured on backend

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Axios](https://axios-http.com)
- [React Router](https://reactrouter.com)
- [TypeScript](https://www.typescriptlang.org)

## 🤝 Contributing

To add new features:

1. Create new page in `client/pages/`
2. Add route in `App.tsx`
3. Create API endpoints in `client/api/endpoints.ts`
4. Use custom hooks (`useApi`, `useMutation`)
5. Follow existing component patterns

## 📄 License

MIT
