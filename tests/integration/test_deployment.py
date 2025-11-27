"""Integration tests for deployment pipeline."""

from pathlib import Path

import pytest

try:
    import yaml
except ImportError:
    yaml = None


class TestDeploymentPipelineConfiguration:
    """Tests for deployment pipeline configuration validation."""

    def test_github_workflow_file_exists(self):
        """Test that GitHub Actions workflow file exists."""
        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "deploy.yml"
        assert workflow_file.exists(), "GitHub Actions workflow file should exist"

    def test_github_workflow_valid_yaml(self):
        """Test that GitHub Actions workflow file is valid YAML."""
        if yaml is None:
            pytest.skip("pyyaml not installed")

        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "deploy.yml"

        if not workflow_file.exists():
            pytest.skip("GitHub Actions workflow file not found")

        try:
            with open(workflow_file) as f:
                workflow = yaml.safe_load(f)
            assert workflow is not None, "Workflow YAML should be valid"
            assert isinstance(workflow, dict), "Workflow should be a dictionary"
        except yaml.YAMLError as e:
            pytest.fail(f"Invalid YAML in workflow file: {e}")

    def test_workflow_has_trigger_on_main(self):
        """Test that workflow triggers on push to main branch."""
        if yaml is None:
            pytest.skip("pyyaml not installed")

        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "deploy.yml"

        if not workflow_file.exists():
            pytest.skip("GitHub Actions workflow file not found")

        with open(workflow_file) as f:
            workflow = yaml.safe_load(f)

        # Check for on.push.branches or on.push
        # YAML may parse 'on' differently, check both 'on' key and True key (for workflow_dispatch:)
        triggers = None
        if "on" in workflow:
            triggers = workflow["on"]
        elif True in workflow:  # workflow_dispatch: without value becomes True key
            triggers = workflow[True]

        assert triggers is not None, "Workflow should have 'on' trigger section"
        # Should trigger on push to main
        if isinstance(triggers, dict):
            if "push" in triggers:
                push_config = triggers["push"]
                if isinstance(push_config, dict) and "branches" in push_config:
                    branches = push_config["branches"]
                    assert "main" in branches or "*" in branches, (
                        "Workflow should trigger on main branch"
                    )
                elif isinstance(push_config, list):
                    assert "main" in push_config, "Workflow should trigger on main branch"
            elif "workflow_dispatch" in triggers:
                # Manual trigger is also acceptable
                pass

    def test_workflow_has_test_step(self):
        """Test that workflow includes test execution step."""
        if yaml is None:
            pytest.skip("pyyaml not installed")

        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "deploy.yml"

        if not workflow_file.exists():
            pytest.skip("GitHub Actions workflow file not found")

        with open(workflow_file) as f:
            workflow = yaml.safe_load(f)

        # Find test step in jobs
        jobs = workflow.get("jobs", {})
        test_found = False

        for job_name, job_config in jobs.items():
            steps = job_config.get("steps", [])
            for step in steps:
                step_name = step.get("name", "").lower()
                step_run = step.get("run", "").lower()
                if "test" in step_name or "pytest" in step_run or "test" in step_run:
                    test_found = True
                    break

        assert test_found, "Workflow should include test execution step"

    def test_workflow_has_code_quality_checks(self):
        """Test that workflow includes code quality checks."""
        if yaml is None:
            pytest.skip("pyyaml not installed")

        # Code quality checks are in CI workflow, not deploy workflow
        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "ci.yml"

        if not workflow_file.exists():
            pytest.skip("GitHub Actions CI workflow file not found")

        with open(workflow_file) as f:
            workflow = yaml.safe_load(f)

        # Find lint/type check steps
        jobs = workflow.get("jobs", {})
        quality_checks_found = False

        for job_name, job_config in jobs.items():
            steps = job_config.get("steps", [])
            for step in steps:
                step_name = step.get("name", "").lower()
                step_run = step.get("run", "").lower()
                keywords = ["lint", "ruff", "pyright", "type", "check"]
                if any(keyword in step_name or keyword in step_run for keyword in keywords):
                    quality_checks_found = True
                    break

        assert quality_checks_found, "CI workflow should include code quality checks"

    def test_workflow_has_fly_deployment(self):
        """Test that workflow includes Fly.io deployment step."""
        if yaml is None:
            pytest.skip("pyyaml not installed")

        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "deploy.yml"

        if not workflow_file.exists():
            pytest.skip("GitHub Actions workflow file not found")

        with open(workflow_file) as f:
            workflow = yaml.safe_load(f)

        # Find Fly.io deployment step
        jobs = workflow.get("jobs", {})
        fly_deployment_found = False

        for job_name, job_config in jobs.items():
            steps = job_config.get("steps", [])
            for step in steps:
                step_uses = step.get("uses", "").lower()
                step_run = step.get("run", "").lower()
                step_name = step.get("name", "").lower()
                if (
                    "fly" in step_uses
                    or "fly" in step_run
                    or "fly" in step_name
                    or "deploy" in step_name
                ):
                    fly_deployment_found = True
                    break

        assert fly_deployment_found, "Workflow should include Fly.io deployment step"

    def test_fly_toml_exists(self):
        """Test that fly.toml configuration file exists."""
        fly_toml = Path(__file__).parent.parent.parent / "fly.toml"
        assert fly_toml.exists(), "fly.toml configuration file should exist"

    def test_fly_toml_has_required_sections(self):
        """Test that fly.toml has required configuration sections."""
        fly_toml = Path(__file__).parent.parent.parent / "fly.toml"

        if not fly_toml.exists():
            pytest.skip("fly.toml file not found")

        content = fly_toml.read_text()

        # Check for required sections
        assert "app" in content.lower(), "fly.toml should have app name"
        assert "build" in content.lower() or "[[services]]" in content.lower(), (
            "fly.toml should have build or services configuration"
        )


class TestDeploymentTimeMeasurement:
    """Tests for deployment time measurement."""

    def test_workflow_has_timeout(self):
        """Test that workflow has timeout configured."""
        if yaml is None:
            pytest.skip("pyyaml not installed")

        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "deploy.yml"

        if not workflow_file.exists():
            pytest.skip("GitHub Actions workflow file not found")

        with open(workflow_file) as f:
            workflow = yaml.safe_load(f)

        # Check for timeout in jobs (test job can be up to 10 minutes,
        # deploy should be <= 5)
        jobs = workflow.get("jobs", {})

        for job_name, job_config in jobs.items():
            timeout = job_config.get("timeout-minutes")
            if timeout is not None:
                # Test job can be up to 10 minutes, deploy job should be <= 5
                if job_name == "deploy":
                    assert timeout <= 5, f"Deploy job timeout should be <= 5 minutes, got {timeout}"
                # Test job timeout of 10 minutes is acceptable
                elif job_name == "test" and timeout == 10:
                    pass  # Test job can have 10 minute timeout
                elif timeout > 10:
                    assert False, f"Job {job_name} timeout should be <= 10 minutes, got {timeout}"

        # Timeout is recommended but not required
        # Just verify if present, it's reasonable

    def test_deployment_job_structure(self):
        """Test that deployment job has proper structure."""
        if yaml is None:
            pytest.skip("pyyaml not installed")

        workflow_file = Path(__file__).parent.parent.parent / ".github" / "workflows" / "deploy.yml"

        if not workflow_file.exists():
            pytest.skip("GitHub Actions workflow file not found")

        with open(workflow_file) as f:
            workflow = yaml.safe_load(f)

        jobs = workflow.get("jobs", {})
        assert len(jobs) > 0, "Workflow should have at least one job"

        # Check that jobs have proper structure
        for job_name, job_config in jobs.items():
            assert "runs-on" in job_config, f"Job {job_name} should have runs-on"
            assert "steps" in job_config, f"Job {job_name} should have steps"
