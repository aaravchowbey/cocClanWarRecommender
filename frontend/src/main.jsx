/*
  File: src/main.jsx
  Purpose: React entry point. Sets up Material UI theme and renders the App
           component into the #root element.
*/
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import './reset.css'

// Create a light theme with Supercell-inspired accents: gold primary, bold headings,
// clean white background, and high readability.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' }, // blue accent
    secondary: { main: '#D94C3A' }, // red accent
    success: { main: '#1E7D2D' },
    warning: { main: '#ED6C02' }, // standard MUI orange
    error: { main: '#C62828' },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#0a0a0a',
      secondary: '#444',
    },
    divider: 'rgba(0,0,0,0.12)'
  },
  typography: {
    // Prefer Clash (Regular 400 / Bold 700), then fall back to Inter/system fonts
    fontFamily: 'Clash, Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    fontWeightRegular: 400,
    fontWeightBold: 700,
    fontSize: 14,
    body1: { fontSize: 15 },
    body2: { fontSize: 14 },
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    button: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          letterSpacing: 0.2,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#FAFAFA',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '0.9rem', // ~14.4px
        },
        body: {
          fontSize: '0.95rem', // ~15.2px
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
