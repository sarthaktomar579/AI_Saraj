import asyncio
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

LOCAL_CONFIG = {
    'python': {'ext': '.py', 'cmd': ['python', '{file}']},
    'javascript': {'ext': '.js', 'cmd': ['node', '{file}']},
    'java': {'ext': '.java', 'cmd_compile': ['javac', '{file}'], 'cmd_run': ['java', '-cp', '{dir}', 'code']},
    'cpp': {'ext': '.cpp', 'cmd_compile': ['g++', '-o', '{dir}/a.exe', '{file}'], 'cmd_run': ['{dir}/a.exe']},
}

class SandboxService:
    TIMEOUT = 15
    MAX_OUTPUT = 10_000

    async def execute(self, language: str, source_code: str, stdin: str = '') -> dict:
        if language not in LOCAL_CONFIG:
            return {
                'stdout': '', 'stderr': f'Unsupported language: {language}',
                'exit_code': 1, 'timed_out': False,
            }

        config = LOCAL_CONFIG[language]

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                src_path = os.path.join(tmpdir, f'code{config["ext"]}')
                with open(src_path, 'w') as f:
                    f.write(source_code)

                if 'cmd_compile' in config:
                    compile_cmd = [c.replace('{file}', src_path).replace('{dir}', tmpdir) for c in config['cmd_compile']]
                    compile_proc = await asyncio.create_subprocess_exec(
                        *compile_cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    compile_stdout, compile_stderr = await compile_proc.communicate()
                    if compile_proc.returncode != 0:
                        return {
                            'stdout': '', 'stderr': compile_stderr.decode()[:self.MAX_OUTPUT],
                            'exit_code': compile_proc.returncode, 'timed_out': False,
                        }
                    run_cmd = [c.replace('{file}', src_path).replace('{dir}', tmpdir) for c in config['cmd_run']]
                else:
                    run_cmd = [c.replace('{file}', src_path) for c in config['cmd']]

                proc = await asyncio.create_subprocess_exec(
                    *run_cmd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                try:
                    stdout_data, stderr_data = await asyncio.wait_for(proc.communicate(input=stdin.encode()), timeout=self.TIMEOUT)
                    return {
                        'stdout': stdout_data.decode()[:self.MAX_OUTPUT],
                        'stderr': stderr_data.decode()[:self.MAX_OUTPUT],
                        'exit_code': proc.returncode,
                        'timed_out': False,
                    }
                except asyncio.TimeoutError:
                    proc.kill()
                    return {
                        'stdout': '', 'stderr': f'Execution timed out ({self.TIMEOUT}s limit)',
                        'exit_code': 124, 'timed_out': True,
                    }

        except Exception as e:
            logger.exception('Code execution error')
            return {
                'stdout': '', 'stderr': str(e),
                'exit_code': 1, 'timed_out': False,
            }

sandbox = SandboxService()
