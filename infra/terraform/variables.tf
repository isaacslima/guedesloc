variable "project_id" {
  type        = string
  description = "ID do projeto GCP (ex: guedesloc-hml ou guedesloc-prod)"
  default     = "guedesloc-hml"
}

variable "region" {
  type        = string
  description = "Região principal do GCP"
  default     = "southamerica-east1" // São Paulo
}

variable "environment" {
  type        = string
  description = "Ambiente (hml ou prod)"
  default     = "hml"
}
