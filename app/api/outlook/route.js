import { spawn } from 'child_process';
import path from 'path';

export async function POST(request) {
  const { ticker, date } = await request.json();

  if (!ticker || !date) {
    return new Response(
      JSON.stringify({ error: 'Ticker and date are required' }),
      { status: 400 }
    );
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const pythonProcess = spawn('python3', [
    path.join(process.cwd(), 'app', 'outlook', 'main.py'),
    '--ticker', ticker,
    '--date', date
  ]);

  // Handle progress updates from stderr
  pythonProcess.stderr.on('data', async (data) => {
    try {
      await writer.write(new TextEncoder().encode(data.toString()));
    } catch (error) {
      console.error('Error writing progress:', error);
    }
  });

  // Handle final result from stdout
  pythonProcess.stdout.on('data', async (data) => {
    try {
      const outlook = parseFloat(data.toString().trim());
      await writer.write(new TextEncoder().encode(JSON.stringify({ outlook }) + '\n'));
    } catch (error) {
      console.error('Error writing result:', error);
    }
  });

  pythonProcess.on('close', async (code) => {
    if (code !== 0) {
      try {
        await writer.write(new TextEncoder().encode(JSON.stringify({ 
          error: 'Process failed' 
        }) + '\n'));
      } catch (error) {
        console.error('Error writing error:', error);
      }
    }
    await writer.close();
  });

  pythonProcess.on('error', async (error) => {
    try {
      await writer.write(new TextEncoder().encode(JSON.stringify({ 
        error: error.message 
      }) + '\n'));
      await writer.close();
    } catch (writeError) {
      console.error('Error writing error:', writeError);
    }
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  });
} 