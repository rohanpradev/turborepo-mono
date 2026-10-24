{{/*
Expand the chart name.
*/}}
{{- define "ecommerce.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a fully qualified release name.
*/}}
{{- define "ecommerce.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "ecommerce.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ecommerce.labels" -}}
helm.sh/chart: {{ include "ecommerce.chart" . }}
app.kubernetes.io/name: {{ include "ecommerce.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "ecommerce.componentName" -}}
{{- include "ecommerce.resourceName" (dict "root" .root "suffix" .service.name) -}}
{{- end -}}

{{/* Retain a readable suffix and unique hash when names exceed DNS label limits. */}}
{{- define "ecommerce.resourceName" -}}
{{- $base := include "ecommerce.fullname" .root -}}
{{- $name := printf "%s-%s" $base .suffix -}}
{{- if le (len $name) 63 -}}
{{- $name -}}
{{- else -}}
{{- $suffix := .suffix | trunc 40 | trimSuffix "-" -}}
{{- $hash := $name | sha256sum | trunc 8 -}}
{{- $prefixLength := sub 63 (add (len $suffix) (len $hash) 2) -}}
{{- $prefix := $base | trunc (int $prefixLength) | trimSuffix "-" -}}
{{- printf "%s-%s-%s" $prefix $suffix $hash -}}
{{- end -}}
{{- end -}}

{{- define "ecommerce.serviceUrl" -}}
{{- $service := index .root.Values.services .key -}}
{{- printf "http://%s:%v" (include "ecommerce.componentName" (dict "root" .root "service" $service)) $service.service.port -}}
{{- end -}}

{{- define "ecommerce.componentLabels" -}}
{{ include "ecommerce.labels" .root }}
app.kubernetes.io/component: {{ .service.name | quote }}
{{- end -}}

{{- define "ecommerce.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ecommerce.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .service.name | quote }}
{{- end -}}

{{- define "ecommerce.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "ecommerce.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "ecommerce.configMapName" -}}
{{- include "ecommerce.resourceName" (dict "root" . "suffix" "config") -}}
{{- end -}}

{{- define "ecommerce.secretName" -}}
{{- default (include "ecommerce.resourceName" (dict "root" . "suffix" "runtime")) .Values.secrets.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Keep hooks and test Pods schedulable wherever application Pods can run. */}}
{{- define "ecommerce.podPlacement" -}}
{{- with .Values.global.priorityClassName }}
priorityClassName: {{ . | quote }}
{{- end }}
{{- with .Values.global.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.global.affinity }}
affinity:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.global.tolerations }}
tolerations:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}

{{- define "ecommerce.image" -}}
{{- $root := .root -}}
{{- $image := .service.image -}}
{{- $registry := default "" $root.Values.global.imageRegistry -}}
{{- $repository := required "service image.repository is required" $image.repository -}}
{{- $tag := default $root.Chart.AppVersion $image.tag -}}
{{- $digest := default "" $image.digest -}}
{{- if and $root.Values.global.requireImageDigests (not (regexMatch "^sha256:[a-f0-9]{64}$" $digest)) -}}
{{- fail "Production profiles require a verified sha256 image digest for every service" -}}
{{- end -}}
{{- $reference := $repository -}}
{{- if $registry -}}
{{- $reference = printf "%s/%s" ($registry | trimSuffix "/") $repository -}}
{{- end -}}
{{- if $digest -}}
{{- printf "%s:%s@%s" $reference $tag $digest -}}
{{- else -}}
{{- printf "%s:%s" $reference $tag -}}
{{- end -}}
{{- end -}}

{{/* Render a tag- or digest-pinned external image. */}}
{{- define "ecommerce.externalImage" -}}
{{- $repository := required "external image.repository is required" .repository -}}
{{- $tag := required "external image.tag is required" .tag -}}
{{- $digest := default "" .digest -}}
{{- if $digest -}}
{{- printf "%s:%s@%s" $repository $tag $digest -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end -}}
