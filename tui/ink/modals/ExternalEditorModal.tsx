/** @jsxImportSource react */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unlink, writeFile, readFile } from 'node:fs/promises';

interface ExternalEditorModalProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}

export const ExternalEditorModal: React.FC<ExternalEditorModalProps> = ({
  initialValue,
  onSave,
  onClose,
}) => {
  const [status, setStatus] = useState<'preparing' | 'waiting' | 'saving' | 'error'>('preparing');
  const [errorMsg, setErrorMsg] = useState('');
  const filePathRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cleanup = async () => {
      if (filePathRef.current) {
        try {
          await unlink(filePathRef.current);
        } catch {
          // ignore
        }
        filePathRef.current = null;
      }
    };

    const launchEditor = async () => {
      try {
        // Create temp file in system tmpdir
        const path = join(tmpdir(), `picro-${randomUUID()}.txt`);
        filePathRef.current = path;

        await writeFile(path, initialValue, 'utf-8');
        if (!isMounted) {
          await unlink(path);
          return;
        }

        setStatus('waiting');

        const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
        const parts = editor.split(' ');
        const cmd = parts[0];
        const args = [...parts.slice(1), path];

        const child = spawn(cmd, args, { stdio: 'inherit', shell: true });

        child.on('error', (err) => {
          if (isMounted) {
            setStatus('error');
            setErrorMsg(`Failed to launch editor: ${err.message}`);
          }
        });

        child.on('exit', async (code) => {
          if (!isMounted) {
            await unlink(path);
            return;
          }

          if (code === 0) {
            try {
              const content = await readFile(path, 'utf-8');
              setStatus('saving');
              await onSave(content);
              await cleanup();
              onClose();
            } catch (err: any) {
              setStatus('error');
              setErrorMsg(`Failed to read edited file: ${err.message}`);
            }
          } else {
            setStatus('error');
            setErrorMsg(`Editor exited with code ${code}`);
          }
          await cleanup();
        });
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMsg(err.message);
        }
        await cleanup();
      }
    };

    launchEditor();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [initialValue, onSave, onClose]);

  const handleForceClose = () => {
    onClose();
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text color="yellow" bold>
        External Editor
      </Text>
      <Box marginTop={1}>
        <Text>
          Status: <Text color={status === 'error' ? 'red' : 'green'}>{status}</Text>
        </Text>
      </Box>
      {status === 'error' && (
        <Box marginTop={1}>
          <Text color="red">{errorMsg}</Text>
        </Box>
      )}
      {status === 'waiting' && (
        <Box marginTop={1}>
          <Text>Launching $EDITOR... (press Ctrl+C to abort)</Text>
        </Box>
      )}
      {status === 'preparing' && (
        <Box marginTop={1}>
          <Text>Preparing temporary file...</Text>
        </Box>
      )}
      {status === 'saving' && (
        <Box marginTop={1}>
          <Text>Saving changes...</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dim>Press Esc to cancel</Text>
      </Box>
    </Box>
  );
};
