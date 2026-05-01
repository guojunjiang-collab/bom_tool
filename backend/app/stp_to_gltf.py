#!/usr/bin/env python3
"""
STP → glTF (glb) 转换脚本
使用 cad-to-gltf 库进行转换

用法: python3 stp_to_gltf.py <input.stp> <output.glb>
"""
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def convert(input_path: str, output_path: str):
    """执行 STP → glTF 转换"""
    try:
        from cad_to_gltf import STPImporter
    except ImportError:
        logger.error("cad_to_gltf 未安装，请执行: pip install cad-to-gltf")
        sys.exit(1)

    if not os.path.exists(input_path):
        logger.error(f"输入文件不存在: {input_path}")
        sys.exit(1)

    logger.info(f"开始转换: {input_path} → {output_path}")

    importer = STPImporter()
    importer.load(input_path)
    importer.export(output_path)

    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        logger.info(f"转换完成: {output_path} ({size / 1024 / 1024:.2f} MB)")
    else:
        logger.error("转换失败：输出文件未生成")
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"用法: {sys.argv[0]} <input.stp> <output.glb>")
        sys.exit(1)

    convert(sys.argv[1], sys.argv[2])
