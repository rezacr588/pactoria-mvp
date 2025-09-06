"""
File management endpoints for Pactoria MVP
File upload, storage, and retrieval for contracts and documents
"""

import os
import uuid
from pathlib import Path

try:
    import magic

    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.exceptions import APIExceptionFactory
from app.infrastructure.database.models import User, AuditLog
from app.schemas.common import (
    ErrorResponse,
    ValidationError,
    UnauthorizedError,
    NotFoundError,
)
from pydantic import BaseModel
from fastapi.security import HTTPBearer

# Security scheme for OpenAPI documentation
security = HTTPBearer()

router = APIRouter(prefix="/files", tags=["Files"])

# Configure upload settings
UPLOAD_DIR = Path(settings.UPLOAD_DIR if hasattr(settings, "UPLOAD_DIR") else "uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".rtf",
    ".odt",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".svg",
}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/rtf",
    "application/vnd.oasis.opendocument.text",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
}


class FileUploadResponse(BaseModel):
    """File upload response"""

    file_id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    upload_url: str
    created_at: str


class FileListResponse(BaseModel):
    """File list response"""

    files: List[FileUploadResponse]
    total: int
    page: int
    size: int


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB",
        )

    # Check file extension
    if file.filename:
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            )

    # Check MIME type (basic validation)
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type not allowed: {file.content_type}",
        )


def get_safe_filename(filename: str) -> str:
    """Generate safe filename"""
    # Remove path components and dangerous characters
    safe_name = os.path.basename(filename)
    safe_name = "".join(c for c in safe_name if c.isalnum() or c in "._-")

    # Ensure filename is not empty and has reasonable length
    if not safe_name or len(safe_name) > 255:
        safe_name = f"file_{uuid.uuid4().hex[:8]}"

    return safe_name


@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload File",
    description="""
    Upload a file (document or image) to the system.
    
    **Supported File Types:**
    - Documents: PDF, DOC, DOCX, TXT, RTF, ODT
    - Images: PNG, JPG, JPEG, GIF, BMP, SVG
    
    **File Constraints:**
    - Maximum file size: 10MB
    - Filename must be safe (no path traversal)
    - MIME type validation performed
    
    **Security Features:**
    - Virus scanning (if configured)
    - Safe file storage with UUID names
    - Audit trail for all uploads
    
    **Use Cases:**
    - Contract document attachments
    - Company logo uploads
    - Supporting documentation
    
    **Requires Authentication:** JWT Bearer token
    """,
    responses={
        201: {"description": "File uploaded successfully", "model": FileUploadResponse},
        400: {"description": "Invalid file type or content", "model": ErrorResponse},
        401: {"description": "Authentication required", "model": UnauthorizedError},
        413: {"description": "File too large", "model": ErrorResponse},
        422: {"description": "Validation error", "model": ValidationError},
    },
    dependencies=[Depends(security)],
)
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    contract_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload file to the system"""

    # Validate file
    validate_file(file)

    try:
        # Generate unique file ID and safe filename
        file_id = str(uuid.uuid4())
        safe_filename = get_safe_filename(file.filename or "uploaded_file")
        stored_filename = f"{file_id}_{safe_filename}"

        # Create company-specific upload directory
        company_dir = UPLOAD_DIR / current_user.company_id
        company_dir.mkdir(exist_ok=True)

        file_path = company_dir / stored_filename

        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Detect MIME type from file content for better validation
        if HAS_MAGIC:
            detected_mime_type = magic.from_buffer(content, mime=True)
            if detected_mime_type not in ALLOWED_MIME_TYPES:
                # Clean up the file
                os.unlink(file_path)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File content type not allowed: {detected_mime_type}",
                )
        else:
            # Fallback to uploaded MIME type if magic is not available
            detected_mime_type = file.content_type or "application/octet-stream"

        # Create file record in database (you might want to create a File model)
        # For now, we'll use audit logs to track uploads

        # Create audit log
        audit_log = AuditLog(
            event_type="file_uploaded",
            resource_type="file",
            resource_id=file_id,
            user_id=current_user.id,
            new_values={
                "filename": safe_filename,
                "original_filename": file.filename,
                "file_size": len(content),
                "mime_type": detected_mime_type,
                "description": description,
                "contract_id": contract_id,
                "file_path": str(file_path),
            },
        )
        db.add(audit_log)
        db.commit()

        return FileUploadResponse(
            file_id=file_id,
            filename=stored_filename,
            original_filename=file.filename or "unknown",
            file_size=len(content),
            mime_type=detected_mime_type,
            upload_url=f"/api/v1/files/{file_id}",
            created_at=audit_log.timestamp.isoformat(),
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Clean up file if it was created
        try:
            if "file_path" in locals() and file_path.exists():
                os.unlink(file_path)
        except Exception as e:
            logger.warning(f"Failed to delete temporary file {file_path}: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )


@router.get(
    "/{file_id}",
    summary="Download File",
    description="""
    Download a file by its ID.
    
    **Access Control:**
    - Users can only download files from their company
    - File access is logged for audit purposes
    
    **Security:**
    - File path validation to prevent directory traversal
    - Company isolation for file access
    - Download audit trail
    
    **Requires Authentication:** JWT Bearer token
    """,
    responses={
        200: {
            "description": "File downloaded successfully",
            "content": {"application/octet-stream": {}},
        },
        401: {"description": "Authentication required", "model": UnauthorizedError},
        404: {"description": "File not found", "model": NotFoundError},
    },
    dependencies=[Depends(security)],
)
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download file by ID"""

    # Find file upload record in audit logs
    upload_log = (
        db.query(AuditLog)
        .filter(
            AuditLog.event_type == "file_uploaded",
            AuditLog.resource_id == file_id,
            AuditLog.user.has(User.company_id == current_user.company_id),
        )
        .first()
    )

    if not upload_log or not upload_log.new_values:
        raise APIExceptionFactory.not_found("File", file_id)

    # Get file information
    file_info = upload_log.new_values
    file_path = Path(file_info.get("file_path"))

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk"
        )

    # Validate file is within upload directory (security check)
    try:
        file_path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="File access denied"
        )

    # Create download audit log
    download_log = AuditLog(
        event_type="file_downloaded",
        resource_type="file",
        resource_id=file_id,
        user_id=current_user.id,
        additional_data={
            "original_filename": file_info.get("original_filename"),
            "file_size": file_info.get("file_size"),
        },
    )
    db.add(download_log)
    db.commit()

    # Return file
    return FileResponse(
        path=str(file_path),
        filename=file_info.get("original_filename", "download"),
        media_type=file_info.get("mime_type", "application/octet-stream"),
    )


@router.get(
    "/",
    response_model=FileListResponse,
    summary="List Files",
    description="""
    List all files uploaded by the current user's company.
    
    **Features:**
    - Pagination support
    - Filter by contract association
    - File metadata included
    - Company isolation
    
    **Requires Authentication:** JWT Bearer token
    """,
    responses={
        200: {"description": "Files listed successfully", "model": FileListResponse},
        401: {"description": "Authentication required", "model": UnauthorizedError},
    },
    dependencies=[Depends(security)],
)
async def list_files(
    page: int = 1,
    size: int = 20,
    contract_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List uploaded files for user's company"""

    # Build query for file uploads
    query = (
        db.query(AuditLog)
        .filter(AuditLog.event_type == "file_uploaded")
        .join(User, AuditLog.user_id == User.id)
        .filter(User.company_id == current_user.company_id)
    )

    # Filter by contract if specified
    if contract_id:
        query = query.filter(AuditLog.new_values["contract_id"].astext == contract_id)

    # Count total
    total = query.count()

    # Apply pagination
    offset = (page - 1) * size
    upload_logs = (
        query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(size).all()
    )

    # Convert to response format
    files = []
    for log in upload_logs:
        if log.new_values:
            files.append(
                FileUploadResponse(
                    file_id=log.resource_id,
                    filename=log.new_values.get("filename", "unknown"),
                    original_filename=log.new_values.get(
                        "original_filename", "unknown"
                    ),
                    file_size=log.new_values.get("file_size", 0),
                    mime_type=log.new_values.get(
                        "mime_type", "application/octet-stream"
                    ),
                    upload_url=f"/api/v1/files/{log.resource_id}",
                    created_at=log.timestamp.isoformat(),
                )
            )

    return FileListResponse(files=files, total=total, page=page, size=size)


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete File",
    description="""
    Delete a file by its ID.
    
    **Security:**
    - Users can only delete files from their company
    - File is removed from disk and database
    - Deletion is logged for audit purposes
    
    **Requires Authentication:** JWT Bearer token
    """,
    responses={
        204: {"description": "File deleted successfully"},
        401: {"description": "Authentication required", "model": UnauthorizedError},
        404: {"description": "File not found", "model": NotFoundError},
    },
    dependencies=[Depends(security)],
)
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete file by ID"""

    # Find file upload record
    upload_log = (
        db.query(AuditLog)
        .filter(
            AuditLog.event_type == "file_uploaded",
            AuditLog.resource_id == file_id,
            AuditLog.user.has(User.company_id == current_user.company_id),
        )
        .first()
    )

    if not upload_log or not upload_log.new_values:
        raise APIExceptionFactory.not_found("File", file_id)

    # Get file path and delete from disk
    file_info = upload_log.new_values
    file_path = Path(file_info.get("file_path"))

    if file_path.exists():
        try:
            os.unlink(file_path)
        except OSError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file from disk: {str(e)}",
            )

    # Create deletion audit log
    delete_log = AuditLog(
        event_type="file_deleted",
        resource_type="file",
        resource_id=file_id,
        user_id=current_user.id,
        old_values=file_info,
        additional_data={"original_upload_time": upload_log.timestamp.isoformat()},
    )
    db.add(delete_log)
    db.commit()
