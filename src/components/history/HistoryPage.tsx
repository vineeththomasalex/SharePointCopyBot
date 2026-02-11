import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import AppLayout from '../layout/AppLayout';
import { dbHelpers, SyncHistory } from '../../db/schema';

export default function HistoryPage() {
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await dbHelpers.getSyncHistory(50);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <AppLayout>
      <Typography variant="h4" gutterBottom>
        Sync History
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : history.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              No sync history yet. Start your first sync to see results here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Added</TableCell>
                <TableCell align="right">Modified</TableCell>
                <TableCell align="right">Deleted</TableCell>
                <TableCell align="right">Failed</TableCell>
                <TableCell align="right">Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                  <TableCell>
                    {entry.action === 'sync_completed' ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Completed"
                        color="success"
                        size="small"
                      />
                    ) : entry.action === 'sync_failed' ? (
                      <Chip
                        icon={<ErrorIcon />}
                        label="Failed"
                        color="error"
                        size="small"
                      />
                    ) : (
                      <Chip label="Started" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">{entry.filesAdded}</TableCell>
                  <TableCell align="right">{entry.filesModified}</TableCell>
                  <TableCell align="right">{entry.filesDeleted}</TableCell>
                  <TableCell align="right">{entry.filesFailed}</TableCell>
                  <TableCell align="right">{formatDuration(entry.duration)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AppLayout>
  );
}
