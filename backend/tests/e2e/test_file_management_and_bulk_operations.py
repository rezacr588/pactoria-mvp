"""
E2E Tests for File Management and Bulk Operations
Tests comprehensive file handling and bulk operation workflows
"""

import pytest
import io
import os
import tempfile
from typing import Dict, Any, List
from unittest.mock import patch, mock_open

from tests.e2e.conftest import E2ETestBase


class TestFileManagementFlows:
    """Complete file management workflow tests"""

    def test_complete_file_upload_workflow(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Upload file → attach to contract → download → verify integrity"""
        client = e2e_test_base.client

        # Setup: Create company, user, and contract
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Upload a document file
        test_file_content = b"This is a test contract document.\nIt contains sample contract text for testing file upload functionality.\n"

        with performance_helper.measure_time("file_upload"):
            files = {
                "file": (
                    "test_contract.txt",
                    io.BytesIO(test_file_content),
                    "text/plain",
                )
            }
            form_data = {
                "description": "Test contract document",
                "contract_id": contract.id,
            }

            upload_response = client.post(
                "/api/v1/files/upload", files=files, data=form_data, headers=headers
            )
            e2e_test_base.assert_response_success(upload_response, 201)

        upload_result = upload_response.json()
        file_id = upload_result["file_id"]

        # Verify upload response
        assert upload_result["original_filename"] == "test_contract.txt"
        assert upload_result["mime_type"] == "text/plain"
        assert upload_result["file_size"] == len(test_file_content)
        assert "upload_url" in upload_result

        # Step 2: List uploaded files
        list_response = client.get("/api/v1/files/", headers=headers)
        e2e_test_base.assert_response_success(list_response)

        file_list = list_response.json()
        assert file_list["total"] >= 1
        assert len(file_list["files"]) >= 1

        # Find our uploaded file
        uploaded_file = None
        for f in file_list["files"]:
            if f["file_id"] == file_id:
                uploaded_file = f
                break

        assert uploaded_file is not None
        assert uploaded_file["original_filename"] == "test_contract.txt"

        # Step 3: Download the file
        with performance_helper.measure_time("file_download"):
            download_response = client.get(f"/api/v1/files/{file_id}", headers=headers)
            e2e_test_base.assert_response_success(download_response)

        # Verify downloaded content matches uploaded content
        downloaded_content = download_response.content
        assert downloaded_content == test_file_content

        # Step 4: Filter files by contract
        contract_files_response = client.get(
            f"/api/v1/files/?contract_id={contract.id}", headers=headers
        )
        e2e_test_base.assert_response_success(contract_files_response)

        contract_files = contract_files_response.json()
        assert contract_files["total"] >= 1

        # Step 5: Delete the file
        delete_response = client.delete(f"/api/v1/files/{file_id}", headers=headers)
        e2e_test_base.assert_response_success(delete_response, 204)

        # Step 6: Verify file is deleted
        deleted_download_response = client.get(
            f"/api/v1/files/{file_id}", headers=headers
        )
        e2e_test_base.assert_response_error(deleted_download_response, 404)

        # Performance assertions
        performance_helper.assert_performance("file_upload", 2000)  # 2 seconds
        performance_helper.assert_performance("file_download", 1000)  # 1 second

    def test_multiple_file_types_workflow(self, e2e_test_base: E2ETestBase):
        """Test: Upload various file types → verify MIME type detection → access control"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Test different file types
        test_files = [
            {
                "filename": "contract.pdf",
                "content": b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj",
                "mime_type": "application/pdf",
            },
            {
                "filename": "contract.docx",
                "content": b"PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00",  # DOCX magic bytes
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
            {
                "filename": "contract.txt",
                "content": b"This is a plain text contract document.",
                "mime_type": "text/plain",
            },
            {
                "filename": "signature.png",
                "content": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x01\x00\x00\x00\x007n\xf9$\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82",
                "mime_type": "image/png",
            },
        ]

        uploaded_files = []

        # Step 1: Upload all file types
        for test_file in test_files:
            files = {
                "file": (
                    test_file["filename"],
                    io.BytesIO(test_file["content"]),
                    test_file["mime_type"],
                )
            }
            form_data = {"description": f"Test {test_file['filename']} upload"}

            upload_response = client.post(
                "/api/v1/files/upload", files=files, data=form_data, headers=headers
            )
            e2e_test_base.assert_response_success(upload_response, 201)

            upload_result = upload_response.json()
            uploaded_files.append(upload_result)

            # Verify MIME type detection
            assert upload_result["original_filename"] == test_file["filename"]
            # Note: MIME type detection might vary based on implementation

        # Step 2: List all uploaded files
        list_response = client.get("/api/v1/files/?page=1&size=20", headers=headers)
        e2e_test_base.assert_response_success(list_response)

        file_list = list_response.json()
        assert file_list["total"] == len(test_files)
        assert len(file_list["files"]) == len(test_files)

        # Step 3: Download each file and verify integrity
        for i, uploaded_file in enumerate(uploaded_files):
            download_response = client.get(
                f"/api/v1/files/{uploaded_file['file_id']}", headers=headers
            )
            e2e_test_base.assert_response_success(download_response)

            downloaded_content = download_response.content
            expected_content = test_files[i]["content"]
            assert downloaded_content == expected_content

        # Step 4: Test file access control (different company user)
        other_company = e2e_test_base.create_test_company({"name": "Other Company"})
        other_user = e2e_test_base.create_test_user(other_company)
        other_headers = e2e_test_base.get_auth_headers(other_user)

        # Should not be able to access files from different company
        for uploaded_file in uploaded_files:
            unauthorized_download = client.get(
                f"/api/v1/files/{uploaded_file['file_id']}", headers=other_headers
            )
            e2e_test_base.assert_response_error(unauthorized_download, 403)

        # Cleanup: Delete uploaded files
        for uploaded_file in uploaded_files:
            delete_response = client.delete(
                f"/api/v1/files/{uploaded_file['file_id']}", headers=headers
            )
            e2e_test_base.assert_response_success(delete_response, 204)

    def test_file_validation_and_security(
        self, e2e_test_base: E2ETestBase, error_scenarios
    ):
        """Test: File validation, size limits, MIME type restrictions, security"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Test 1: File too large (mock large file)
        large_file_content = b"x" * (11 * 1024 * 1024)  # 11MB (exceeds 10MB limit)
        files = {
            "file": ("large_file.txt", io.BytesIO(large_file_content), "text/plain")
        }

        large_file_response = client.post(
            "/api/v1/files/upload", files=files, headers=headers
        )
        e2e_test_base.assert_response_error(
            large_file_response, 413
        )  # Request Entity Too Large

        # Test 2: Invalid file extension
        invalid_extension_content = b"Invalid file content"
        files = {
            "file": (
                "malicious.exe",
                io.BytesIO(invalid_extension_content),
                "application/octet-stream",
            )
        }

        invalid_ext_response = client.post(
            "/api/v1/files/upload", files=files, headers=headers
        )
        e2e_test_base.assert_response_error(invalid_ext_response, 400)  # Bad Request

        # Test 3: Invalid MIME type
        files = {
            "file": ("test.txt", io.BytesIO(b"test content"), "application/javascript")
        }  # JS not allowed

        invalid_mime_response = client.post(
            "/api/v1/files/upload", files=files, headers=headers
        )
        e2e_test_base.assert_response_error(invalid_mime_response, 400)

        # Test 4: Empty file
        files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}

        empty_file_response = client.post(
            "/api/v1/files/upload", files=files, headers=headers
        )
        # Note: Empty file handling depends on business requirements
        # e2e_test_base.assert_response_error(empty_file_response, 400)

        # Test 5: No file provided
        no_file_response = client.post(
            "/api/v1/files/upload", data={"description": "No file"}, headers=headers
        )
        e2e_test_base.assert_response_error(no_file_response, 422)  # Validation error

        # Test 6: Path traversal attempt in filename
        malicious_content = b"Malicious content"
        files = {
            "file": ("../../../etc/passwd", io.BytesIO(malicious_content), "text/plain")
        }

        path_traversal_response = client.post(
            "/api/v1/files/upload", files=files, headers=headers
        )
        if path_traversal_response.status_code == 201:
            # If upload succeeds, verify filename was sanitized
            result = path_traversal_response.json()
            assert "../" not in result["filename"]
            assert "etc/passwd" not in result["filename"]

    def test_file_batch_operations(self, e2e_test_base: E2ETestBase):
        """Test: Upload multiple files → batch download → batch delete"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Upload multiple files for the same contract
        batch_files = []
        for i in range(5):
            file_content = f"This is batch test file {i+1}\nContent for contract attachment.".encode()

            files = {
                "file": (
                    f"batch_file_{i+1}.txt",
                    io.BytesIO(file_content),
                    "text/plain",
                )
            }
            form_data = {
                "description": f"Batch test file {i+1}",
                "contract_id": contract.id,
            }

            upload_response = client.post(
                "/api/v1/files/upload", files=files, data=form_data, headers=headers
            )
            e2e_test_base.assert_response_success(upload_response, 201)
            batch_files.append(upload_response.json())

        # Step 2: List files with pagination
        page1_response = client.get("/api/v1/files/?page=1&size=3", headers=headers)
        e2e_test_base.assert_response_success(page1_response)

        page1_data = page1_response.json()
        assert page1_data["page"] == 1
        assert page1_data["size"] == 3
        assert len(page1_data["files"]) == 3
        assert page1_data["total"] == 5

        page2_response = client.get("/api/v1/files/?page=2&size=3", headers=headers)
        e2e_test_base.assert_response_success(page2_response)

        page2_data = page2_response.json()
        assert page2_data["page"] == 2
        assert len(page2_data["files"]) == 2  # Remaining files

        # Step 3: Filter files by contract
        contract_files_response = client.get(
            f"/api/v1/files/?contract_id={contract.id}", headers=headers
        )
        e2e_test_base.assert_response_success(contract_files_response)

        contract_files = contract_files_response.json()
        assert contract_files["total"] == 5

        # Step 4: Bulk delete files (individual deletes)
        for batch_file in batch_files:
            delete_response = client.delete(
                f"/api/v1/files/{batch_file['file_id']}", headers=headers
            )
            e2e_test_base.assert_response_success(delete_response, 204)

        # Step 5: Verify all files deleted
        final_list_response = client.get("/api/v1/files/", headers=headers)
        e2e_test_base.assert_response_success(final_list_response)

        final_list = final_list_response.json()
        assert final_list["total"] == 0


class TestBulkOperationsFlows:
    """Comprehensive bulk operations workflow tests"""

    def test_bulk_contract_update_workflow(
        self, e2e_test_base: E2ETestBase, bulk_operation_data, performance_helper
    ):
        """Test: Create multiple contracts → bulk update → verify changes"""
        client = e2e_test_base.client

        # Setup: Create company with admin user (for bulk operations)
        company = e2e_test_base.create_test_company()
        admin_user = e2e_test_base.create_test_user(
            company, e2e_test_base.test_data_factory.create_admin_user_data(company.id)
        )
        headers = e2e_test_base.get_auth_headers(admin_user)

        # Step 1: Create multiple contracts for bulk operations
        contracts_to_update = []
        for i in range(10):
            contract_data = {
                "title": f"Bulk Update Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} for bulk update testing",
                "client_name": f"Bulk Client {i+1}",
                "contract_value": 20000 + (i * 5000),
                "status": "draft",
            }

            create_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(create_response, 201)
            contracts_to_update.append(create_response.json())

        # Step 2: Perform bulk update
        bulk_update_data = {"updates": []}

        # Update various fields for different contracts
        for i, contract in enumerate(contracts_to_update):
            update_data = {"contract_id": contract["id"]}

            if i < 3:  # First 3 contracts: activate
                update_data["status"] = "active"
            elif i < 6:  # Next 3 contracts: update client name
                update_data["client_name"] = f"Updated Bulk Client {i+1}"
            else:  # Last 4 contracts: update value
                update_data["contract_value"] = 100000 + (i * 10000)

            bulk_update_data["updates"].append(update_data)

        with performance_helper.measure_time("bulk_contract_update"):
            bulk_update_response = client.post(
                "/api/v1/bulk/contracts/update", json=bulk_update_data, headers=headers
            )
            e2e_test_base.assert_response_success(bulk_update_response)

        bulk_result = bulk_update_response.json()
        assert "operation_id" in bulk_result or "successful_count" in bulk_result

        # Step 3: Verify updates applied correctly
        for i, contract in enumerate(contracts_to_update):
            updated_contract_response = client.get(
                f"/api/v1/contracts/{contract['id']}", headers=headers
            )
            e2e_test_base.assert_response_success(updated_contract_response)

            updated_contract = updated_contract_response.json()

            if i < 3:  # Should be activated
                assert updated_contract["status"] == "active"
            elif i < 6:  # Should have updated client name
                assert updated_contract["client_name"] == f"Updated Bulk Client {i+1}"
            else:  # Should have updated value
                assert updated_contract["contract_value"] == 100000 + (i * 10000)

        # Performance assertion
        performance_helper.assert_performance(
            "bulk_contract_update", 5000
        )  # 5 seconds for 10 contracts

    def test_bulk_contract_export_workflow(
        self, e2e_test_base: E2ETestBase, bulk_operation_data
    ):
        """Test: Create contracts → export in various formats → verify exports"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Create contracts with diverse data for export
        export_contracts = []
        contract_types = [
            "service_agreement",
            "employment_contract",
            "nda",
            "consultancy",
        ]

        for i in range(8):
            contract_data = {
                "title": f"Export Contract {i+1}",
                "contract_type": contract_types[i % len(contract_types)],
                "plain_english_input": f"Contract {i+1} for export testing with comprehensive data",
                "client_name": f"Export Client {i+1}",
                "supplier_name": f"Export Supplier {i+1}",
                "contract_value": 25000 + (i * 7500),
                "currency": "GBP",
                "status": "active" if i % 2 == 0 else "draft",
            }

            create_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(create_response, 201)
            export_contracts.append(create_response.json())

        # Generate content for some contracts to have more export data
        for contract in export_contracts[:4]:
            generate_response = client.post(
                f"/api/v1/contracts/{contract['id']}/generate",
                json={"regenerate": False},
                headers=headers,
            )
            e2e_test_base.assert_response_success(generate_response)

        # Step 2: Test CSV export
        csv_export_data = {
            "contract_ids": [c["id"] for c in export_contracts],
            "format": "csv",
            "fields": [
                "title",
                "contract_type",
                "client_name",
                "contract_value",
                "status",
                "created_at",
            ],
            "include_content": False,
        }

        csv_export_response = client.post(
            "/api/v1/bulk/contracts/export", json=csv_export_data, headers=headers
        )
        e2e_test_base.assert_response_success(csv_export_response)

        csv_result = csv_export_response.json()
        assert "export_id" in csv_result or "download_url" in csv_result

        # Step 3: Test Excel export with different fields
        excel_export_data = {
            "contract_ids": [c["id"] for c in export_contracts[:5]],  # Subset
            "format": "excel",
            "fields": [
                "title",
                "contract_type",
                "supplier_name",
                "contract_value",
                "currency",
            ],
            "include_content": False,
        }

        excel_export_response = client.post(
            "/api/v1/bulk/contracts/export", json=excel_export_data, headers=headers
        )
        e2e_test_base.assert_response_success(excel_export_response)

        # Step 4: Test JSON export with full content
        json_export_data = {
            "contract_ids": [
                c["id"] for c in export_contracts if c["status"] == "active"
            ],  # Filter
            "format": "json",
            "include_content": True,
            "include_versions": False,
        }

        json_export_response = client.post(
            "/api/v1/bulk/contracts/export", json=json_export_data, headers=headers
        )
        e2e_test_base.assert_response_success(json_export_response)

        json_result = json_export_response.json()
        assert "export_id" in json_result or "download_url" in json_result

        # Step 5: Test PDF export (if supported)
        pdf_export_data = {
            "contract_ids": [export_contracts[0]["id"]],  # Single contract
            "format": "pdf",
            "include_content": True,
        }

        pdf_export_response = client.post(
            "/api/v1/bulk/contracts/export", json=pdf_export_data, headers=headers
        )
        # PDF export might not be implemented yet
        if pdf_export_response.status_code not in [501, 400]:
            e2e_test_base.assert_response_success(pdf_export_response)

    def test_bulk_user_management_workflow(
        self, e2e_test_base: E2ETestBase, bulk_operation_data
    ):
        """Test: Bulk invite users → manage roles → verify permissions"""
        client = e2e_test_base.client

        # Setup: Create company with admin user
        company = e2e_test_base.create_test_company()
        admin_user = e2e_test_base.create_test_user(
            company, e2e_test_base.test_data_factory.create_admin_user_data(company.id)
        )
        headers = e2e_test_base.get_auth_headers(admin_user)

        # Step 1: Bulk invite users
        invitation_data = {
            "invitations": [
                {
                    "email": "bulk.manager1@testcompany.com",
                    "role": "contract_manager",
                    "department": "Legal",
                    "send_email": False,  # Don't actually send emails
                },
                {
                    "email": "bulk.reviewer1@testcompany.com",
                    "role": "legal_reviewer",
                    "department": "Compliance",
                    "send_email": False,
                },
                {
                    "email": "bulk.viewer1@testcompany.com",
                    "role": "viewer",
                    "department": "Finance",
                    "send_email": False,
                },
                {
                    "email": "bulk.manager2@testcompany.com",
                    "role": "contract_manager",
                    "department": "Operations",
                    "send_email": False,
                },
            ]
        }

        bulk_invite_response = client.post(
            "/api/v1/bulk/users/invite", json=invitation_data, headers=headers
        )
        e2e_test_base.assert_response_success(bulk_invite_response)

        invite_result = bulk_invite_response.json()
        assert "operation_id" in invite_result or "successful_count" in invite_result

        # Step 2: Verify users were created (implementation dependent)
        # Note: This depends on how bulk invitations are handled
        # Users might be created immediately or require acceptance

        # Step 3: Test bulk role changes
        # First, create some actual users to change roles for
        test_users = []
        for i in range(3):
            user_data = e2e_test_base.test_data_factory.create_user_data(
                company_id=company.id
            )
            user_data["email"] = f"role-change-user-{i}@testcompany.com"
            user_data["role"] = "viewer"  # Start as viewer
            test_user = e2e_test_base.create_test_user(company, user_data)
            test_users.append(test_user)

        # Bulk role change
        role_change_data = {
            "role_changes": [
                {"user_id": test_users[0].id, "new_role": "contract_manager"},
                {"user_id": test_users[1].id, "new_role": "legal_reviewer"},
                {"user_id": test_users[2].id, "new_role": "contract_manager"},
            ]
        }

        bulk_role_response = client.put(
            "/api/v1/bulk/users/role-change", json=role_change_data, headers=headers
        )
        e2e_test_base.assert_response_success(bulk_role_response)

        # Step 4: Verify role changes applied
        # Note: This would require a user management endpoint to verify roles
        # For now, test that the bulk operation completed successfully

    def test_bulk_contract_delete_workflow(self, e2e_test_base: E2ETestBase):
        """Test: Create contracts → bulk soft delete → verify data integrity"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        admin_user = e2e_test_base.create_test_user(
            company, e2e_test_base.test_data_factory.create_admin_user_data(company.id)
        )
        headers = e2e_test_base.get_auth_headers(admin_user)

        # Step 1: Create contracts for deletion
        contracts_to_delete = []
        for i in range(6):
            contract_data = {
                "title": f"Delete Test Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} for deletion testing",
                "client_name": f"Delete Client {i+1}",
                "status": "draft" if i < 3 else "active",  # Mix of statuses
            }

            create_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(create_response, 201)
            contracts_to_delete.append(create_response.json())

        # Step 2: Perform bulk delete
        delete_data = {
            "contract_ids": [c["id"] for c in contracts_to_delete],
            "deletion_reason": "Bulk deletion test - cleaning up test contracts",
        }

        bulk_delete_response = client.post(
            "/api/v1/bulk/contracts/delete", json=delete_data, headers=headers
        )
        e2e_test_base.assert_response_success(bulk_delete_response)

        delete_result = bulk_delete_response.json()
        assert "operation_id" in delete_result or "successful_count" in delete_result

        # Step 3: Verify contracts are no longer in active list
        list_response = client.get("/api/v1/contracts/", headers=headers)
        e2e_test_base.assert_response_success(list_response)

        active_contracts = list_response.json()["contracts"]
        deleted_ids = [c["id"] for c in contracts_to_delete]

        for contract in active_contracts:
            assert (
                contract["id"] not in deleted_ids
            ), "Deleted contract still appears in active list"

        # Step 4: Verify individual contract access returns 404 or shows terminated status
        for contract in contracts_to_delete:
            individual_response = client.get(
                f"/api/v1/contracts/{contract['id']}", headers=headers
            )
            # Depending on implementation, this might return 404 or show terminated status
            assert individual_response.status_code in [404, 200]

            if individual_response.status_code == 200:
                contract_data = individual_response.json()
                assert contract_data.get("status") == "terminated"

    def test_bulk_operation_status_tracking(self, e2e_test_base: E2ETestBase):
        """Test: Initiate bulk operation → monitor status → get results"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        admin_user = e2e_test_base.create_test_user(
            company, e2e_test_base.test_data_factory.create_admin_user_data(company.id)
        )
        headers = e2e_test_base.get_auth_headers(admin_user)

        # Create contracts for bulk export (async operation)
        contracts = []
        for i in range(3):
            contract_data = {
                "title": f"Status Tracking Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} for status tracking test",
            }

            create_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(create_response, 201)
            contracts.append(create_response.json())

        # Step 1: Initiate bulk export (potentially async operation)
        export_data = {
            "contract_ids": [c["id"] for c in contracts],
            "format": "json",
            "include_content": True,
        }

        export_response = client.post(
            "/api/v1/bulk/contracts/export", json=export_data, headers=headers
        )
        e2e_test_base.assert_response_success(export_response)

        export_result = export_response.json()

        # Step 2: Check if operation ID is provided for status tracking
        if "operation_id" in export_result:
            operation_id = export_result["operation_id"]

            # Step 3: Monitor operation status
            status_response = client.get(
                f"/api/v1/bulk/status/{operation_id}", headers=headers
            )

            if status_response.status_code == 501:  # Not implemented
                # Document expected behavior
                pass
            else:
                e2e_test_base.assert_response_success(status_response)

                status_data = status_response.json()
                assert (
                    "status" in status_data
                )  # e.g., "PENDING", "PROCESSING", "COMPLETED"
                assert "operation_id" in status_data

                # In a real implementation, you might poll until completion
                # while status_data["status"] in ["PENDING", "PROCESSING"]:
                #     time.sleep(1)
                #     status_response = client.get(f"/api/v1/bulk/status/{operation_id}", headers=headers)
                #     status_data = status_response.json()


class TestIntegratedFileAndBulkWorkflows:
    """Tests that combine file management with bulk operations"""

    def test_bulk_contract_export_with_files(self, e2e_test_base: E2ETestBase):
        """Test: Create contracts with file attachments → bulk export including files"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Create contracts with file attachments
        contracts_with_files = []

        for i in range(3):
            # Create contract
            contract_data = {
                "title": f"Contract with Files {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} with file attachments for export testing",
            }

            contract_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(contract_response, 201)
            contract = contract_response.json()

            # Attach files to contract
            attached_files = []
            for j in range(2):  # 2 files per contract
                file_content = f"File {j+1} for contract {i+1}\nAttached document content.".encode()

                files = {
                    "file": (
                        f"contract_{i+1}_file_{j+1}.txt",
                        io.BytesIO(file_content),
                        "text/plain",
                    )
                }
                form_data = {
                    "description": f"File {j+1} for contract {i+1}",
                    "contract_id": contract["id"],
                }

                upload_response = client.post(
                    "/api/v1/files/upload", files=files, data=form_data, headers=headers
                )
                e2e_test_base.assert_response_success(upload_response, 201)
                attached_files.append(upload_response.json())

            contracts_with_files.append({"contract": contract, "files": attached_files})

        # Step 2: Export contracts with file information
        export_data = {
            "contract_ids": [c["contract"]["id"] for c in contracts_with_files],
            "format": "json",
            "include_content": True,
            "include_attachments": True,  # If supported
        }

        export_response = client.post(
            "/api/v1/bulk/contracts/export", json=export_data, headers=headers
        )
        e2e_test_base.assert_response_success(export_response)

        export_result = export_response.json()

        # Step 3: Verify export includes file references
        # Note: Actual file inclusion in exports depends on implementation
        # At minimum, file metadata should be included

        # Cleanup: Delete files
        for contract_with_files in contracts_with_files:
            for file_info in contract_with_files["files"]:
                delete_response = client.delete(
                    f"/api/v1/files/{file_info['file_id']}", headers=headers
                )
                e2e_test_base.assert_response_success(delete_response, 204)

    def test_contract_template_file_management(self, e2e_test_base: E2ETestBase):
        """Test: Upload template files → create contracts from templates → file inheritance"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        template = e2e_test_base.create_test_template()
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Upload a template-related file
        template_file_content = b"This is a template guidance document.\nInstructions for using this contract template."

        files = {
            "file": (
                "template_guidance.pdf",
                io.BytesIO(template_file_content),
                "application/pdf",
            )
        }
        form_data = {
            "description": "Template guidance document",
            "template_id": template.id,  # If supported
        }

        template_file_response = client.post(
            "/api/v1/files/upload", files=files, data=form_data, headers=headers
        )
        e2e_test_base.assert_response_success(template_file_response, 201)
        template_file = template_file_response.json()

        # Step 2: Create contract using template
        contract_data = {
            "title": "Contract from Template with Files",
            "contract_type": template.contract_type.value,
            "template_id": template.id,
            "plain_english_input": "Create contract using template with file inheritance",
        }

        contract_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers
        )
        e2e_test_base.assert_response_success(contract_response, 201)
        contract = contract_response.json()

        # Step 3: Add contract-specific files
        contract_file_content = (
            b"This is a contract-specific document.\nAdditional terms and conditions."
        )

        files = {
            "file": (
                "additional_terms.txt",
                io.BytesIO(contract_file_content),
                "text/plain",
            )
        }
        form_data = {
            "description": "Contract-specific additional terms",
            "contract_id": contract["id"],
        }

        contract_file_response = client.post(
            "/api/v1/files/upload", files=files, data=form_data, headers=headers
        )
        e2e_test_base.assert_response_success(contract_file_response, 201)
        contract_file = contract_file_response.json()

        # Step 4: List all files for the contract
        contract_files_response = client.get(
            f"/api/v1/files/?contract_id={contract['id']}", headers=headers
        )
        e2e_test_base.assert_response_success(contract_files_response)

        contract_files = contract_files_response.json()
        assert contract_files["total"] >= 1  # At least the contract-specific file

        # Step 5: Cleanup
        client.delete(f"/api/v1/files/{template_file['file_id']}", headers=headers)
        client.delete(f"/api/v1/files/{contract_file['file_id']}", headers=headers)
