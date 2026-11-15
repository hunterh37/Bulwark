terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = var.region }
variable "region" { default = "us-east-1" }

resource "aws_sqs_queue" "scan_dlq" { name = "bulwark-scan-dlq" }
resource "aws_sqs_queue" "scan" {
  name           = "bulwark-scan-jobs"
  redrive_policy = jsonencode({ deadLetterTargetArn = aws_sqs_queue.scan_dlq.arn, maxReceiveCount = 3 })
}
resource "aws_sqs_queue" "fix" { name = "bulwark-fix-jobs" }
resource "aws_kms_key" "tenant" { description = "Bulwark tenant data", enable_key_rotation = true }
# TODO: VPC, RDS Postgres, ECS cluster + services, EC2 metal for Firecracker
