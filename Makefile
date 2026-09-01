# E-Commerce Microservices Makefile
# Stable public command surface; implementations live in focused make/*.mk files.

SHELL := /bin/bash
.SHELLFLAGS := -o pipefail -c
.DEFAULT_GOAL := help

include make/common.mk
include make/development.mk
include make/docker.mk
include make/kubernetes.mk
include make/quick.mk
