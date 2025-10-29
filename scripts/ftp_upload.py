#!/usr/bin/env python3
import argparse
import ftplib
import os
import posixpath
from pathlib import Path
from typing import Optional


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Upload a local directory to an FTP server.")
    parser.add_argument("--host", default=os.getenv("FTP_HOST"), help="FTP host (env FTP_HOST)")
    parser.add_argument("--user", default=os.getenv("FTP_USER"), help="FTP username (env FTP_USER)")
    parser.add_argument("--password", default=os.getenv("FTP_PASS"), help="FTP password (env FTP_PASS)")
    parser.add_argument(
        "--local",
        default="dist",
        help="Local directory to upload (default: dist)",
    )
    parser.add_argument(
        "--remote",
        default="/",
        help="Remote directory on the FTP server (default: /)",
    )
    parser.add_argument(
        "--passive",
        action="store_true",
        help="Enable passive mode (useful for some firewalls).",
    )
    parser.add_argument(
        "--active",
        action="store_true",
        help="Force active mode (default).",
    )
    return parser.parse_args()


def ensure_remote_dir(ftp: ftplib.FTP, remote_dir: str) -> str:
    """Ensure remote_dir exists on the FTP server and return its normalized absolute path."""
    if not remote_dir:
        remote_dir = "/"

    remote_dir = remote_dir.replace("\\", "/")
    if not remote_dir.startswith("/"):
        remote_dir = "/" + remote_dir

    # Collapse duplicate slashes
    remote_dir = posixpath.normpath(remote_dir)
    if remote_dir == ".":
        remote_dir = "/"

    if remote_dir == "/":
        return remote_dir

    parts = [segment for segment in remote_dir.split("/") if segment]
    path_so_far = ""
    for part in parts:
        path_so_far = f"{path_so_far}/{part}"
        try:
            ftp.mkd(path_so_far)
        except ftplib.error_perm as exc:
            # Ignore "directory already exists" errors (550...), raise others.
            if not str(exc).startswith("550"):
                raise
    return remote_dir


def upload_directory(
    ftp: ftplib.FTP, local_dir: Path, remote_root: str
) -> None:
    root_abs = ensure_remote_dir(ftp, remote_root)

    for dirpath, _, filenames in os.walk(local_dir):
        dirpath = Path(dirpath)
        relative = dirpath.relative_to(local_dir)
        remote_dir = posixpath.join(root_abs, str(relative).replace("\\", "/")) if relative != Path(".") else root_abs
        remote_dir = ensure_remote_dir(ftp, remote_dir)

        ftp.cwd(remote_dir)
        for filename in filenames:
            local_file = dirpath / filename
            with local_file.open("rb") as file_handle:
                ftp.storbinary(f"STOR {filename}", file_handle)
        ftp.cwd("/")


def main() -> None:
    args = parse_args()

    if not args.host or not args.user or not args.password:
        raise SystemExit("FTP host, user, and password must be provided via flags or environment variables.")

    local_dir = Path(args.local)
    if not local_dir.exists() or not local_dir.is_dir():
        raise SystemExit(f"Local directory '{local_dir}' does not exist or is not a directory.")

    with ftplib.FTP(args.host) as ftp:
        if args.passive:
            ftp.set_pasv(True)
        elif args.active:
            ftp.set_pasv(False)
        ftp.login(args.user, args.password)
        upload_directory(ftp, local_dir, args.remote)
        ftp.quit()


if __name__ == "__main__":
    main()
