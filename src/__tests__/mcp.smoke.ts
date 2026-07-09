import { spawn } from 'child_process';

test('MCP capture_clean_view returns base64 image', async () => {
  const proc = spawn('npx', ['tsx', 'src/mcp-server.ts'], { stdio: ['pipe', 'pipe', 'pipe'] });

  const request = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'capture_clean_view', arguments: { url: 'https://example.com' } }
  }) + '\n';

  proc.stdin.write(request);

  const response = await new Promise<string>((resolve) => {
    proc.stdout.once('data', (d) => resolve(d.toString()));
  });

  const parsed = JSON.parse(response);
  expect(parsed.result.content[1].data.length).toBeGreaterThan(1000); // has image
  proc.kill();
}, 30_000);
