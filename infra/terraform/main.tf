terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─── 1. Service Account do Gateway API ───────────────────────────
resource "google_service_account" "gateway_sa" {
  account_id   = "guedesloc-gateway-sa-${var.environment}"
  display_name = "Service Account do Gateway de Integrações Guedesloc (${var.environment})"
}

# ─── 2. Dead-Letter Queue (DLQ) Pub/Sub ──────────────────────────
resource "google_pubsub_topic" "os_dlq_topic" {
  name = "os.events.dlq"

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_pubsub_subscription" "os_dlq_sub" {
  name  = "os.events.dlq-sub"
  topic = google_pubsub_topic.os_dlq_topic.name

  message_retention_duration = "604800s" # 7 dias
}

# ─── 3. Barramento de Eventos Pub/Sub ────────────────────────────
locals {
  pubsub_topics = [
    "os.criada",
    "os.status_alterado",
    "os.cancelada",
    "os.finalizada"
  ]
}

resource "google_pubsub_topic" "os_topics" {
  for_each = toset(local.pubsub_topics)
  name     = each.value

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Subscription para processadores com DLQ configurada
resource "google_pubsub_subscription" "os_subscriptions" {
  for_each = toset(local.pubsub_topics)
  name     = "${each.value}-sub"
  topic    = google_pubsub_topic.os_topics[each.value].name

  ack_deadline_seconds = 30

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.os_dlq_topic.id
    max_delivery_attempts = 5
  }
}

# ─── 4. Secret Manager (Credenciais de Integradoras) ─────────────
resource "google_secret_manager_secret" "integradoras_secret" {
  secret_id = "integradoras-credentials-${var.environment}"

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  replication {
    auto {}
  }
}

# Conceder permissão de leitura de Secrets para a Service Account do Gateway
resource "google_secret_manager_secret_iam_member" "secret_access" {
  secret_id = google_secret_manager_secret.integradoras_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.gateway_sa.email}"
}
