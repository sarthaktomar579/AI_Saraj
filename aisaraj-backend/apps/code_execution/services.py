"""Code execution service — runs code in local subprocess."""
import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

# Execution commands per language
LOCAL_CONFIG = {
    'python': {'ext': '.py', 'cmd': ['python', '{file}']},
    'javascript': {'ext': '.js', 'cmd': ['node', '{file}']},
    'java': {'ext': '.java', 'cmd_compile': ['javac', '{file}'], 'cmd_run': ['java', '-cp', '{dir}', 'code']},
    'cpp': {'ext': '.cpp', 'cmd_compile': ['g++', '-o', '{dir}/a.exe', '{file}'], 'cmd_run': ['{dir}/a.exe']},
}

SUPPORTED_LANGUAGES = list(LOCAL_CONFIG.keys())


class SandboxService:
    TIMEOUT = 15
    MAX_OUTPUT = 10_000

    def execute(self, language: str, source_code: str, stdin: str = '') -> dict:
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

                # For compiled languages (Java, C++)
                if 'cmd_compile' in config:
                    compile_cmd = [c.replace('{file}', src_path).replace('{dir}', tmpdir)
                                   for c in config['cmd_compile']]
                    compile_result = subprocess.run(
                        compile_cmd, capture_output=True, text=True, timeout=self.TIMEOUT,
                    )
                    if compile_result.returncode != 0:
                        return {
                            'stdout': '', 'stderr': compile_result.stderr[:self.MAX_OUTPUT],
                            'exit_code': compile_result.returncode, 'timed_out': False,
                        }

                    run_cmd = [c.replace('{file}', src_path).replace('{dir}', tmpdir)
                               for c in config['cmd_run']]
                else:
                    # Interpreted languages (Python, JS)
                    run_cmd = [c.replace('{file}', src_path) for c in config['cmd']]

                result = subprocess.run(
                    run_cmd, input=stdin, capture_output=True,
                    text=True, timeout=self.TIMEOUT,
                )

                return {
                    'stdout': result.stdout[:self.MAX_OUTPUT],
                    'stderr': result.stderr[:self.MAX_OUTPUT],
                    'exit_code': result.returncode,
                    'timed_out': False,
                }

        except subprocess.TimeoutExpired:
            return {
                'stdout': '', 'stderr': f'Execution timed out ({self.TIMEOUT}s limit)',
                'exit_code': 124, 'timed_out': True,
            }
        except FileNotFoundError as e:
            return {
                'stdout': '',
                'stderr': f'Runtime not found for {language}. Make sure Python/Node/g++ is installed.\nError: {e}',
                'exit_code': 1, 'timed_out': False,
            }
        except Exception as e:
            logger.exception('Code execution error')
            return {
                'stdout': '', 'stderr': str(e),
                'exit_code': 1, 'timed_out': False,
            }
