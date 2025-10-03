terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
}

# Configure the Kubernetes Provider
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

# Configure the Helm Provider
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# Data sources
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = var.cluster_name
}

# VPC Configuration
resource "aws_vpc" "science_map_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "science-map-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "science_map_igw" {
  vpc_id = aws_vpc.science_map_vpc.id

  tags = {
    Name        = "science-map-igw"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public_subnets" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.science_map_vpc.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name        = "science-map-public-subnet-${count.index + 1}"
    Environment = var.environment
    Type        = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private_subnets" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.science_map_vpc.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "science-map-private-subnet-${count.index + 1}"
    Environment = var.environment
    Type        = "private"
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.science_map_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.science_map_igw.id
  }

  tags = {
    Name        = "science-map-public-rt"
    Environment = var.environment
  }
}

# Route Table Associations for Public Subnets
resource "aws_route_table_association" "public_rta" {
  count          = length(aws_subnet.public_subnets)
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

# EKS Cluster
resource "aws_eks_cluster" "science_map_cluster" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.public_subnets[*].id, aws_subnet.private_subnets[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_service_policy,
  ]

  tags = {
    Name        = "science-map-cluster"
    Environment = var.environment
  }
}

# EKS Node Group
resource "aws_eks_node_group" "science_map_nodes" {
  cluster_name    = aws_eks_cluster.science_map_cluster.name
  node_group_name = "science-map-nodes"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private_subnets[*].id

  capacity_type  = "ON_DEMAND"
  instance_types = var.node_instance_types

  scaling_config {
    desired_size = var.node_desired_size
    max_size     = var.node_max_size
    min_size     = var.node_min_size
  }

  update_config {
    max_unavailable_percentage = 25
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = {
    Name        = "science-map-nodes"
    Environment = var.environment
  }
}

# RDS Database
resource "aws_db_instance" "science_map_db" {
  identifier = "science-map-db"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "science_map"
  username = "postgres"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.science_map_db_subnet_group.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = var.environment == "development"

  tags = {
    Name        = "science-map-db"
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "science_map_redis_subnet_group" {
  name       = "science-map-redis-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id
}

resource "aws_elasticache_replication_group" "science_map_redis" {
  replication_group_id       = "science-map-redis"
  description                = "Science Map Platform Redis cluster"

  node_type            = var.redis_node_type
  port                 = 6379
  parameter_group_name = "default.redis7"

  num_cache_clusters = var.redis_num_cache_clusters

  subnet_group_name  = aws_elasticache_subnet_group.science_map_redis_subnet_group.name
  security_group_ids = [aws_security_group.redis_sg.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name        = "science-map-redis"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "science_map_alb" {
  name               = "science-map-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnets[*].id

  enable_deletion_protection = var.environment == "production"

  tags = {
    Name        = "science-map-alb"
    Environment = var.environment
  }
}

# ALB Target Group
resource "aws_lb_target_group" "science_map_tg" {
  name     = "science-map-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.science_map_vpc.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = {
    Name        = "science-map-tg"
    Environment = var.environment
  }
}

# ALB Listener
resource "aws_lb_listener" "science_map_listener" {
  load_balancer_arn = aws_lb.science_map_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.science_map_tg.arn
  }
}

# HTTPS Listener (if SSL certificate is provided)
resource "aws_lb_listener" "science_map_listener_https" {
  count             = var.ssl_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.science_map_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.science_map_tg.arn
  }
}
