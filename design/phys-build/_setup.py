# -*- coding: utf-8 -*-
"""物理学院工作目录初始化：从 chip-academy 样板拷贝四件套。"""
import os, shutil
SRC = r'E:\Hanako\学习计划\学院工厂\academy-framework-v2\chip-academy'
DST = r'E:\Hanako\学习计划\四学院\design\phys-build'
os.makedirs(DST, exist_ok=True)
for name in os.listdir(SRC):
    s = os.path.join(SRC, name)
    d = os.path.join(DST, name)
    if os.path.isdir(s):
        if os.path.exists(d): shutil.rmtree(d)
        shutil.copytree(s, d)
    else:
        shutil.copy2(s, d)
print('copied to', DST)
for name in sorted(os.listdir(DST)):
    print(' ', name)
