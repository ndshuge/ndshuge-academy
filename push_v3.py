# -*- coding: utf-8 -*-
"""四学院 v3 推送：只 push 本地已提交 main（不 add 不 commit），带代理与强推兜底"""
import io, os, re, sys, subprocess

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='gbk', errors='replace')
        sys.stderr.reconfigure(encoding='gbk', errors='replace')
    except Exception:
        pass

HERE = r'E:\Hanako\学习计划\四学院'
OWNER = 'ndshuge'
REPO = 'ndshuge-academy'

def find_token():
    candidates = [
        r'E:\Hanako\学习计划\learn-c\部署备忘-C语言学院.md',
        r'E:\Hanako\学习计划\学习\数学\高数教材\部署备忘-普林斯顿学院.md',
    ]
    pat = re.compile(r'ghp_[A-Za-z0-9]{20,}')
    for p in candidates:
        try:
            s = io.open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        m = pat.search(s)
        if m:
            return m.group(0)
    return None

CA_BUNDLE = r'E:\Hanako\scripts\ca-bundle-root.crt'

def git(args, env_extra=None):
    env = dict(os.environ)
    if env_extra:
        env.update(env_extra)
    base = ['git', '-c', 'user.name=' + OWNER, '-c', 'user.email=ndshuge@gmail.com', '-c', 'http.sslBackend=openssl', '-c', 'http.sslCAInfo=' + CA_BUNDLE]
    return subprocess.run(base + args, cwd=HERE, env=env,
                          capture_output=True, text=True, encoding='utf-8', errors='replace')

def main():
    print('==========================================')
    print('  push only: %s/%s' % (OWNER, REPO))
    print('==========================================')
    token = find_token()
    if not token:
        print('[x] token not found')
        return 1
    # 待推确认
    r = git(['rev-list', '--count', 'origin/main..main'])
    pending = (r.stdout or '0').strip()
    print('[1/3] 待推 commit 数:', pending)

    remote = 'https://%s:%s@github.com/%s/%s.git' % (OWNER, token, OWNER, REPO)
    git(['remote', 'remove', 'origin'])
    git(['remote', 'add', 'origin', remote])

    proxy = {'HTTPS_PROXY': 'http://127.0.0.1:7897', 'HTTP_PROXY': 'http://127.0.0.1:7897'}
    print('[2/3] 直连推送...')
    rr = git(['push', 'origin', 'main'])
    if rr.returncode != 0:
        print('      直连失败(%s)，走代理...' % rr.returncode)
        rr = git(['push', 'origin', 'main'], env_extra=proxy)
    if rr.returncode != 0:
        print('      被拒，强制覆盖推送...')
        rr = git(['push', '-f', 'origin', 'main'], env_extra=proxy)
    git(['remote', 'set-url', 'origin', 'https://github.com/%s/%s.git' % (OWNER, REPO)])

    if rr.returncode == 0:
        print('==========================================')
        print('  [3/3] push OK!')
        print('  https://%s.github.io/%s/' % (OWNER, REPO))
        print('  (1-2 min to live)')
        print('==========================================')
        return 0
    print('push failed:')
    print(rr.stderr[-900:] or rr.stdout[-900:])
    return 1

if __name__ == '__main__':
    sys.exit(main())
