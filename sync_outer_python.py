# -*- coding: utf-8 -*-
"""把集成站最新版 python.html 同步到外面独立 Python 学院站（ndshuge/ndshuge-python-academy）"""
import io, os, re, sys, subprocess

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='gbk', errors='replace')
        sys.stderr.reconfigure(encoding='gbk', errors='replace')
    except Exception:
        pass

HERE = r'E:\Hanako的记忆\学习计划\learn-python'
SRC = r'E:\Hanako的记忆\学习计划\四学院\python.html'
REPO = 'ndshuge-python-academy'

def find_token():
    pat = re.compile(r'ghp_[A-Za-z0-9]{20,}')
    for p in [r'E:\Hanako的记忆\学习计划\learn-c\部署备忘-C语言学院.md',
              r'E:\Hanako的记忆\学习计划\学习\数学\高数教材\部署备忘-普林斯顿学院.md']:
        try:
            s = io.open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        m = pat.search(s)
        if m:
            return m.group(0)
    return None

def git(args, env_extra=None):
    env = dict(os.environ)
    if env_extra:
        env.update(env_extra)
    return subprocess.run(['git', '-c', 'user.name=ndshuge', '-c', 'user.email=ndshuge@gmail.com'] + args,
                          cwd=HERE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')

def main():
    print('==========================================')
    print('  同步外面 Python 站 (ndshuge-python-academy)')
    print('==========================================')
    token = find_token()
    if not token:
        print('[错误] 未能读取令牌')
        return 1

    import shutil
    shutil.copyfile(SRC, os.path.join(HERE, 'index.html'))
    print('[1/3] 已复制集成站最新 python.html -> learn-python/index.html')

    git(['add', 'index.html'])
    r = git(['commit', '-m', 'sync latest from academy hub'])
    if r.returncode not in (0, 1):
        print('  提交失败:', r.stderr[-300:])
        return 1

    print('[2/3] 推送中（走 Clash 代理）...')
    git(['remote', 'remove', 'origin'])
    git(['remote', 'add', 'origin', 'https://ndshuge:%s@github.com/ndshuge/%s.git' % (token, REPO)])
    proxy = {'HTTPS_PROXY': 'http://127.0.0.1:7897', 'HTTP_PROXY': 'http://127.0.0.1:7897'}
    r = git(['push', '-u', 'origin', 'main'], env_extra=proxy)
    if r.returncode != 0:
        r = git(['push', '-f', '-u', 'origin', 'main'], env_extra=proxy)
    git(['remote', 'set-url', 'origin', 'https://github.com/ndshuge/%s.git' % REPO])
    if r.returncode != 0:
        print('  推送失败:', r.stderr[-400:])
        return 1

    print()
    print('==========================================')
    print('  [3/3] 同步成功！')
    print('  外面站：https://ndshuge.github.io/ndshuge-python-academy/')
    print('  （等 1-2 分钟生效）')
    print('==========================================')
    return 0

if __name__ == '__main__':
    sys.exit(main())
