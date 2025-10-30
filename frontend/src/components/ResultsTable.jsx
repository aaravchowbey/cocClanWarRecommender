/*
  File: src/components/ResultsTable.jsx
  Purpose: Material UI table for displaying member results with sortable columns.
           Sorting is driven by props; this component emits sort change events.
*/
import React from 'react'
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Chip
} from '@mui/material'
import { formatDate, getTownHallImgSrc } from '../utils'

// Column definitions: key maps to data fields, label is header text, numeric helps align.
const COLUMNS = [
  { key: 'recommendationScore', label: 'Recommendations', numeric: false },
  { key: 'playerName', label: 'Player', numeric: false },
  { key: 'townHall', label: 'Town Hall', numeric: true },
//   { key: 'cumAttacksUsed', label: 'Attacks Used', numeric: true },
  { key: 'cumAttacksPossible', label: 'Attacks Possible', numeric: true },
  { key: 'attacksLeft', label: 'Attacks Missed', numeric: true },
  { key: 'avgDestruction', label: 'Avg Destruction %', numeric: true },
  { key: 'lastUpdated', label: 'Last Updated', numeric: false },
  { key: 'playerID', label: 'Player ID', numeric: false },
]

function attacksLeftColor(v) {
  if (!Number.isFinite(v)) return 'default'
  // In war context, 0 attacks left is GOOD (used all) -> success
  if (v === 0) return 'success'
  // 1 left is okay-ish -> warning; more remaining -> error
  if (v === 1) return 'warning'
  return 'error'
}

export default function ResultsTable({ rows, orderBy, order, onRequestSort }) {
  const createSortHandler = (key) => () => onRequestSort(key)

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table size="medium" aria-label="results table" sx={{
        minWidth: 760,
        '& th, & td': { py: 1.25 }, // slightly more vertical padding for readability
      }}>
        <TableHead>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableCell key={col.key} align={col.numeric ? 'right' : 'left'}>
                <TableSortLabel
                  active={orderBy === col.key}
                  direction={orderBy === col.key ? order : 'asc'}
                  onClick={createSortHandler(col.key)}
                  sx={{
                    '&.Mui-active': { color: 'primary.main' },
                    '&.Mui-active .MuiTableSortLabel-icon': { color: 'primary.main !important' },
                  }}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody sx={{
          '& tr:nth-of-type(odd)': { backgroundColor: 'rgba(0,0,0,0.02)' },
        }}>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center" sx={{ color: 'text.secondary' }}>
                No results to display.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((m, idx) => (
              <TableRow key={idx} hover>
                <TableCell>
                  {Number.isFinite(m.recommendationRank) ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Chip label={`#${m.recommendationRank}`} size="small" color="primary" variant="outlined" />
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell>{m.playerName || '-'}</TableCell>
                <TableCell align="right">
                  {Number.isFinite(m.townHall) ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <span>{m.townHall}</span>
                      {getTownHallImgSrc(m.townHall) && (
                        <img
                          src={getTownHallImgSrc(m.townHall)}
                          alt={`Town Hall ${m.townHall}`}
                          width={28}
                          height={28}
                          style={{ objectFit: 'contain' }}
                          loading="lazy"
                        />
                      )}
                    </span>
                  ) : '-'}
                </TableCell>
                {/* <TableCell align="right">{Number.isFinite(m.cumAttacksUsed) ? m.cumAttacksUsed : '-'}</TableCell> */}
                <TableCell align="right">{Number.isFinite(m.cumAttacksPossible) ? m.cumAttacksPossible : '-'}</TableCell>
                <TableCell align="right">
                  {Number.isFinite(m.attacksLeft)
                    ? <Chip label={m.attacksLeft} color={attacksLeftColor(m.attacksLeft)} size="small" variant="outlined" />
                    : '-'}
                </TableCell>
                <TableCell align="right">{Number.isFinite(m.avgDestruction) ? Math.round(m.avgDestruction) : '-'}</TableCell>
                <TableCell title={m.lastUpdated || ''}>{formatDate(m.lastUpdated)}</TableCell>
                <TableCell>{m.playerID || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
