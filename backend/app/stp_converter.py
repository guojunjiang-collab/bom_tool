"""
STP/OCC 三维模型转换服务
- 上传 STP 文件后自动转换为 glTF 格式
- 供前端 Three.js 渲染预览
"""
import os
import subprocess
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# PythonOCC 在 Docker 容器内的路径
PYTHONOCC_SCRIPT = "/app/app/stp_to_gltf.py"


def is_stp_file(filename: str) -> bool:
    """判断是否为 STP/STEP 文件"""
    if not filename:
        return False
    ext = Path(filename).suffix.lower()
    return ext in ('.stp', '.step')


def convert_stp_to_gltf(stp_path: str) -> Optional[str]:
    """
    将 STP 文件转换为 glTF 格式（.glb）

    Args:
        stp_path: STP 文件的绝对路径

    Returns:
        生成的 .glb 文件路径，失败返回 None
    """
    stp_file = Path(stp_path)
    if not stp_file.exists():
        logger.error(f"STP 文件不存在: {stp_path}")
        return None

    # 输出文件名与 STP 同名，后缀改为 .glb
    glb_path = stp_file.with_suffix('.glb')

    # 如果已存在转换结果且比 STP 新，跳过
    if glb_path.exists() and glb_path.stat().st_mtime >= stp_file.stat().st_mtime:
        logger.info(f"glTF 已存在且最新，跳过转换: {glb_path}")
        return str(glb_path)

    try:
        logger.info(f"开始转换 STP → glTF: {stp_path}")
        result = subprocess.run(
            ['python3', PYTHONOCC_SCRIPT, str(stp_file), str(glb_path)],
            capture_output=True,
            text=True,
            timeout=120,  # 最多 2 分钟
        )

        if result.returncode != 0:
            logger.error(f"转换失败 (exit={result.returncode}): {result.stderr}")
            return None

        if glb_path.exists():
            size_mb = glb_path.stat().st_size / 1024 / 1024
            logger.info(f"转换成功: {glb_path} ({size_mb:.2f} MB)")
            return str(glb_path)
        else:
            logger.error(f"转换完成但输出文件不存在: {glb_path}")
            return None

    except subprocess.TimeoutExpired:
        logger.error(f"转换超时 (120s): {stp_path}")
        return None
    except Exception as e:
        logger.error(f"转换异常: {e}")
        return None


def get_gltf_path(stp_path: str) -> Optional[str]:
    """
    获取 STP 文件对应的 glTF 文件路径（不触发转换）

    Args:
        stp_path: STP 文件的绝对路径

    Returns:
        .glb 文件路径，不存在返回 None
    """
    glb_path = Path(stp_path).with_suffix('.glb')
    return str(glb_path) if glb_path.exists() else None
