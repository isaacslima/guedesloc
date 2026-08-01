output "gateway_service_account_email" {
  description = "E-mail da Service Account do Gateway"
  value       = google_service_account.gateway_sa.email
}

output "pubsub_topics" {
  description = "Lista dos tópicos Pub/Sub criados"
  value       = [for t in google_pubsub_topic.os_topics : t.name]
}

output "secret_manager_name" {
  description = "Nome da secret no Secret Manager"
  value       = google_secret_manager_secret.integradoras_secret.secret_id
}
