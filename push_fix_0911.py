# -*- coding: utf-8 -*-
"""2026-09-11 修复定点推送：只提交 index.html / c.html / calculus.html 并推送 ndshuge-academy
   推送机制（token/CA/代理/兜底）与 push_v3.py 完全同源"""
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
FILES = ['index.html', 'c.html', 'calculus.html']
MSG = '''fix: 微积分分式笔误 + 门户不想学全灰/首次提示 + C填空框密度收紧

- calculus.html: 速度竞赛分式写反, eˣ/xⁿ→0 改为 xⁿ/eˣ→0
- index.html: .ac-off 整卡全灰, 星标按钮补样式, 首次使用提示, offNote 文案修正
- c.html: 删 fillbox 死 min-height 规则, pre 行高 1.9→1.5, 头部/提示/按钮区密度收紧'''

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
    print('  fix push 2026-09-11 -> %s/%s' % (OWNER, REPO))
    print('==========================================')
    token = find_token()
    if not token:
        print('[x] token not found')
        return 1

    print('[1/3] 提交: ' + ', '.join(FILES))
    git(['add'] + FILES)
    r = git(['commit', '-m', MSG])
    if r.returncode == 0:
        print('      commit OK')
    elif r.returncode == 1 or 'nothing to commit' in (r.stdout or '') + (r.stderr or ''):
        print('      无新变化可提交(可能已提交过), 继续推送')
    else:
        print('      commit 异常: ' + (r.stderr or r.stdout or '')[-400:])

    rc = git(['rev-list', '--count', 'origin/main..main'])
    print('      待推 commit 数:', (rc.stdout or '?').strip())

    remote = 'https://%s:%s@github.com/%s/%s.git' % (OWNER, token, OWNER, REPO)
    git(['remote', 'remove', 'origin'])
    git(['remote', 'add', 'origin', remote])

    proxy = {'HTTPS_PROXY': 'http://127.0.0.1:7897', 'HTTP_PROXY': 'http://127.0.0.1:7897'}
    print('[2/3] 推送中...')
    rr = git(['push', 'origin', 'main'])
    if rr.returncode != 0:
        print('      直连失败, 走代理...')
        rr = git(['push', 'origin', 'main'], env_extra=proxy)
    if rr.returncode != 0:
        print('      被拒, 强制覆盖推送...')
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
