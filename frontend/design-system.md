# CMF Vibration Monitor - Design System

## Current Implementation (As of Now)

### Color Palette
- **Primary Accent**: Cyan-400 (#22d3ee) for active states, highlights
- **Dark Mode Background**: Slate-900 (#0f172a) to Slate-800 (#1e293b) gradient
- **Light Mode Background**: Slate-50 (#f8fafc) to Slate-100 (#f1f5f9) gradient
- **Dark Mode Text**: White (#ffffff)
- **Light Mode Text**: Slate-900 (#0f172a)
- **Borders**: Slate-700 (dark), Slate-300 (light)

### Typography
- **Font Family**: System UI (San Francisco, Segoe UI, Roboto, sans-serif)
- **Headings**: Bold, larger sizes
- **Body**: Regular, comfortable line-height

### Components

#### Sidebar
- **Width**: 256px (expanded), 80px (collapsed)
- **Position**: Fixed, left side
- **Background**: Gradient (dark or light based on theme)
- **Navigation**: Vertical list with icons
- **Active State**: Cyan accent with left border
- **Theme Toggle**: Sun/Moon icons in footer

#### Buttons
- **Primary**: Cyan background, white text
- **Secondary**: Slate background, white text
- **Hover**: Slight opacity change
- **Transition**: 200ms ease-in-out

### Theme Implementation
- **Context**: React Context API (contexts/ThemeContext.jsx)
- **State**: isDarkMode boolean
- **Persistence**: localStorage
- **Default**: Dark mode
- **Toggle**: Adds/removes 'dark' class on html element

### Current Pages
1. **Live Monitoring** - Placeholder
2. **Defect Analysis** - Placeholder  
3. **History** - Placeholder
4. **Machine Config** - Data table with machine configurations

### API Configuration
- **Base URL**: http://172.18.7.42:8000
- **Endpoints**: Machine, MasterTable, Checkpoint, Record, Defects

### File Structure
```
src/
├── components/
│   ├── sidenav.jsx
│   └── pages/
│       └── machineconfig.jsx
├── contexts/
│   └── ThemeContext.jsx
├── config/
│   └── api.js
└── App.jsx
```

## Future Design Tokens (Reserved for Future Use)

### Planned Color System
- **Signal Blue** (Primary): #2578A6 - for actions, links, active nav
- **Graphite** (Neutral): #5C6B79 - for sidebar, navbar
- **Teal**: #0E9AA7 - secondary chart series
- **Violet**: #6E5BA6 - maintenance state
- **Success**: #1E8E5A
- **Warning**: #C9861A
- **Danger**: #C0342C

### Planned Typography
- **UI Font**: Inter, system-ui
- **Mono Font**: IBM Plex Mono for numeric data
- **Sizes**: Display (28px), H1 (24px), H2 (20px), H3 (16px), Body (13px)

### Planned Spacing
- **Base Unit**: 4px
- **Scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px

### Planned Components
- Layout: AppLayout, Sidebar, TopNavbar
- UI: Button, Input, Select, Switch, Dialog, Toast
- Data Display: DataTable, StatusBadge, MetricCard, ChartCard
- Charts: TrendChart, FFTChart, WaveformChart
- Alarms: AlarmCard, NotificationPanel
- Machines: MachineCard, HealthIndicator
