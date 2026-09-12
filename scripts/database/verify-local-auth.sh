#!/usr/bin/env bash
set -euo pipefail

# The generated local keys stay in process memory. Never enable shell tracing in this script.
eval "$(supabase status -o env)"
: "${API_URL:?Supabase local API URL is unavailable}"
: "${ANON_KEY:?Supabase local anonymous key is unavailable}"
: "${SERVICE_ROLE_KEY:?Supabase local service-role key is unavailable}"

work_dir="$(mktemp -d)"
primary_user_id=""
revoked_user_id=""

admin_request() {
  local method="$1"
  local path="$2"
  local body_file="$3"
  local output_file="$4"
  curl --silent --show-error \
    --output "${output_file}" \
    --write-out '%{http_code}' \
    --request "${method}" \
    --header "apikey: ${SERVICE_ROLE_KEY}" \
    --header "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    --header 'Content-Type: application/json' \
    --data-binary "@${body_file}" \
    "${API_URL}/auth/v1${path}"
}

public_request() {
  local method="$1"
  local path="$2"
  local body_file="$3"
  local output_file="$4"
  local bearer="${5:-}"
  local headers=(
    --header "apikey: ${ANON_KEY}"
    --header 'Content-Type: application/json'
  )
  if [[ -n "${bearer}" ]]; then
    headers+=(--header "Authorization: Bearer ${bearer}")
  fi
  curl --silent --show-error \
    --output "${output_file}" \
    --write-out '%{http_code}' \
    --request "${method}" \
    "${headers[@]}" \
    --data-binary "@${body_file}" \
    "${API_URL}/auth/v1${path}"
}

require_success() {
  local status="$1"
  local operation="$2"
  local response_file="$3"
  if [[ ! "${status}" =~ ^2 ]]; then
    local safe_error
    safe_error="$(jq -r '.msg // .message // .error_description // .error // "unknown local Auth error"' "${response_file}" 2>/dev/null || true)"
    echo "${operation} failed with HTTP ${status}: ${safe_error}" >&2
    exit 1
  fi
}

require_rejection() {
  local status="$1"
  local operation="$2"
  local response_file="$3"
  local safe_code
  safe_code="$(jq -r '.error_code // .code // .error // "unclassified"' "${response_file}" 2>/dev/null || true)"
  if [[ ! "${status}" =~ ^(400|401|403|422)$ ]]; then
    echo "${operation} returned HTTP ${status} (${safe_code}); an explicit Auth denial was required." >&2
    exit 1
  fi
  if ! jq -e '
    type == "object"
    and ([.error_code, .code, .error, .msg, .message, .error_description]
      | any(. != null and (tostring | length > 0)))
  ' "${response_file}" >/dev/null 2>&1; then
    echo "${operation} returned HTTP ${status} without a structured Auth error." >&2
    exit 1
  fi
}

delete_test_user() {
  local user_id="$1"
  [[ -z "${user_id}" ]] && return
  printf '{}' >"${work_dir}/delete.json"
  admin_request DELETE "/admin/users/${user_id}" "${work_dir}/delete.json" \
    "${work_dir}/delete-response.json" >/dev/null || true
}

cleanup() {
  set +e
  delete_test_user "${primary_user_id}"
  delete_test_user "${revoked_user_id}"
  rm -rf "${work_dir}"
}
trap cleanup EXIT

# Public registration must stay disabled.
jq -n '{email:"p1-public-signup@example.test",password:"Not-for-production-123!"}' \
  >"${work_dir}/signup.json"
signup_status="$(public_request POST /signup "${work_dir}/signup.json" "${work_dir}/signup-response.json")"
require_rejection "${signup_status}" 'public signup while signup is disabled' \
  "${work_dir}/signup-response.json"

# Generate and accept a real local invitation without sending external email.
jq -n '{type:"invite",email:"p1-auth-lifecycle@example.test",redirect_to:"http://127.0.0.1:3000/admin/auth/callback"}' \
  >"${work_dir}/invite.json"
invite_status="$(admin_request POST /admin/generate_link "${work_dir}/invite.json" "${work_dir}/invite-response.json")"
require_success "${invite_status}" 'administrator invitation generation' "${work_dir}/invite-response.json"
primary_user_id="$(jq -er '.user.id // .id' "${work_dir}/invite-response.json")"
invite_token="$(jq -er '.hashed_token // .properties.hashed_token' "${work_dir}/invite-response.json")"

jq -n --arg token "${invite_token}" '{type:"invite",token_hash:$token}' \
  >"${work_dir}/verify-invite.json"
verify_status="$(public_request POST /verify "${work_dir}/verify-invite.json" "${work_dir}/verify-invite-response.json")"
require_success "${verify_status}" 'invitation acceptance' "${work_dir}/verify-invite-response.json"
invite_access_token="$(jq -er '.access_token' "${work_dir}/verify-invite-response.json")"
invite_refresh_token="$(jq -er '.refresh_token' "${work_dir}/verify-invite-response.json")"
session_status="$(
  curl --silent --show-error \
    --output "${work_dir}/invite-session-response.json" \
    --write-out '%{http_code}' \
    --header "apikey: ${ANON_KEY}" \
    --header "Authorization: Bearer ${invite_access_token}" \
    "${API_URL}/auth/v1/user"
)"
require_success "${session_status}" 'invited administrator session lookup' \
  "${work_dir}/invite-session-response.json"
jq -e --arg id "${primary_user_id}" '.id == $id' \
  "${work_dir}/invite-session-response.json" >/dev/null

reuse_status="$(public_request POST /verify "${work_dir}/verify-invite.json" "${work_dir}/reuse-invite-response.json")"
require_rejection "${reuse_status}" 'reuse of a one-time invitation token' \
  "${work_dir}/reuse-invite-response.json"

# The application disables an account in its profile and applies a long Auth ban. The
# database policy test proves the profile-side denial; this proves the provider refresh
# session cannot survive the ban. Existing stateless JWTs remain valid only until expiry.
jq -n '{ban_duration:"876000h"}' >"${work_dir}/ban.json"
ban_status="$(admin_request PUT "/admin/users/${primary_user_id}" "${work_dir}/ban.json" "${work_dir}/ban-response.json")"
require_success "${ban_status}" 'administrator account ban' "${work_dir}/ban-response.json"

jq -n --arg refresh "${invite_refresh_token}" '{refresh_token:$refresh}' \
  >"${work_dir}/refresh.json"
refresh_status="$(public_request POST '/token?grant_type=refresh_token' "${work_dir}/refresh.json" "${work_dir}/refresh-response.json")"
require_rejection "${refresh_status}" 'refresh of a disabled administrator session' \
  "${work_dir}/refresh-response.json"

jq -n '{ban_duration:"none"}' \
  >"${work_dir}/unban.json"
unban_status="$(admin_request PUT "/admin/users/${primary_user_id}" "${work_dir}/unban.json" "${work_dir}/unban-response.json")"
require_success "${unban_status}" 'controlled account re-enable' "${work_dir}/unban-response.json"

# Exercise the provider recovery token as a single-use flow after controlled re-enable.
jq -n '{type:"recovery",email:"p1-auth-lifecycle@example.test",redirect_to:"http://127.0.0.1:3000/admin/auth/callback"}' \
  >"${work_dir}/recovery.json"
recovery_status="$(admin_request POST /admin/generate_link "${work_dir}/recovery.json" "${work_dir}/recovery-response.json")"
require_success "${recovery_status}" 'account recovery link generation' "${work_dir}/recovery-response.json"
recovery_token="$(jq -er '.hashed_token // .properties.hashed_token' "${work_dir}/recovery-response.json")"
jq -n --arg token "${recovery_token}" '{type:"recovery",token_hash:$token}' \
  >"${work_dir}/verify-recovery.json"
recovery_verify_status="$(public_request POST /verify "${work_dir}/verify-recovery.json" "${work_dir}/verify-recovery-response.json")"
require_success "${recovery_verify_status}" 'account recovery verification' "${work_dir}/verify-recovery-response.json"
jq -e --arg id "${primary_user_id}" \
  '.user.id == $id and (.access_token | type == "string") and (.refresh_token | type == "string")' \
  "${work_dir}/verify-recovery-response.json" >/dev/null
recovery_access_token="$(jq -er '.access_token' "${work_dir}/verify-recovery-response.json")"
recovery_reuse_status="$(public_request POST /verify "${work_dir}/verify-recovery.json" "${work_dir}/reuse-recovery-response.json")"
require_rejection "${recovery_reuse_status}" 'reuse of a one-time recovery token' \
  "${work_dir}/reuse-recovery-response.json"

# Complete recovery by changing the password through the fresh recovery session,
# then prove that the recovered credential can establish a normal password session.
jq -n '{password:"Recovered-password-123!"}' \
  >"${work_dir}/recovered-password.json"
password_update_status="$(public_request PUT /user "${work_dir}/recovered-password.json" \
  "${work_dir}/recovered-password-response.json" "${recovery_access_token}")"
require_success "${password_update_status}" 'recovered password update' \
  "${work_dir}/recovered-password-response.json"
jq -e --arg id "${primary_user_id}" '(.id // .user.id) == $id' \
  "${work_dir}/recovered-password-response.json" >/dev/null

jq -n '{email:"p1-auth-lifecycle@example.test",password:"Recovered-password-123!"}' \
  >"${work_dir}/password-signin.json"
password_signin_status="$(public_request POST '/token?grant_type=password' \
  "${work_dir}/password-signin.json" "${work_dir}/password-signin-response.json")"
require_success "${password_signin_status}" 'sign-in with the recovered password' \
  "${work_dir}/password-signin-response.json"
jq -e --arg id "${primary_user_id}" \
  '.user.id == $id and (.access_token | type == "string") and (.refresh_token | type == "string")' \
  "${work_dir}/password-signin-response.json" >/dev/null
password_access_token="$(jq -er '.access_token' "${work_dir}/password-signin-response.json")"
password_refresh_token="$(jq -er '.refresh_token' "${work_dir}/password-signin-response.json")"

# Establish an independent second session so global scope is distinguished from local sign-out.
second_password_signin_status="$(public_request POST '/token?grant_type=password' \
  "${work_dir}/password-signin.json" "${work_dir}/second-password-signin-response.json")"
require_success "${second_password_signin_status}" 'second sign-in with the recovered password' \
  "${work_dir}/second-password-signin-response.json"
jq -e --arg id "${primary_user_id}" \
  '.user.id == $id and (.access_token | type == "string") and (.refresh_token | type == "string")' \
  "${work_dir}/second-password-signin-response.json" >/dev/null
second_password_refresh_token="$(jq -er '.refresh_token' \
  "${work_dir}/second-password-signin-response.json")"

# A standalone global sign-out must revoke every refresh session without disabling the account.
printf '{}' >"${work_dir}/logout.json"
logout_status="$(public_request POST '/logout?scope=global' "${work_dir}/logout.json" \
  "${work_dir}/logout-response.json" "${password_access_token}")"
require_success "${logout_status}" 'global administrator session revocation' \
  "${work_dir}/logout-response.json"

jq -n --arg refresh "${password_refresh_token}" '{refresh_token:$refresh}' \
  >"${work_dir}/revoked-password-refresh.json"
revoked_password_refresh_status="$(public_request POST '/token?grant_type=refresh_token' \
  "${work_dir}/revoked-password-refresh.json" "${work_dir}/revoked-password-refresh-response.json")"
require_rejection "${revoked_password_refresh_status}" \
  'refresh after global revocation of the password session' \
  "${work_dir}/revoked-password-refresh-response.json"

jq -n --arg refresh "${second_password_refresh_token}" '{refresh_token:$refresh}' \
  >"${work_dir}/revoked-second-password-refresh.json"
revoked_second_password_refresh_status="$(public_request POST '/token?grant_type=refresh_token' \
  "${work_dir}/revoked-second-password-refresh.json" \
  "${work_dir}/revoked-second-password-refresh-response.json")"
require_rejection "${revoked_second_password_refresh_status}" \
  'refresh of the independent second session after global revocation' \
  "${work_dir}/revoked-second-password-refresh-response.json"

post_revocation_signin_status="$(public_request POST '/token?grant_type=password' \
  "${work_dir}/password-signin.json" "${work_dir}/post-revocation-signin-response.json")"
require_success "${post_revocation_signin_status}" \
  'password sign-in after standalone session revocation' \
  "${work_dir}/post-revocation-signin-response.json"
jq -e --arg id "${primary_user_id}" \
  '.user.id == $id and (.access_token | type == "string") and (.refresh_token | type == "string")' \
  "${work_dir}/post-revocation-signin-response.json" >/dev/null

# Revoking an unused invitation deletes the local Auth identity, which invalidates its link.
jq -n '{type:"invite",email:"p1-revoked-invite@example.test",redirect_to:"http://127.0.0.1:3000/admin/auth/callback"}' \
  >"${work_dir}/revoked-invite.json"
revoked_status="$(admin_request POST /admin/generate_link "${work_dir}/revoked-invite.json" "${work_dir}/revoked-invite-response.json")"
require_success "${revoked_status}" 'revocable invitation generation' "${work_dir}/revoked-invite-response.json"
revoked_user_id="$(jq -er '.user.id // .id' "${work_dir}/revoked-invite-response.json")"
revoked_token="$(jq -er '.hashed_token // .properties.hashed_token' "${work_dir}/revoked-invite-response.json")"
delete_test_user "${revoked_user_id}"
jq -n --arg token "${revoked_token}" '{type:"invite",token_hash:$token}' \
  >"${work_dir}/verify-revoked.json"
revoked_verify_status="$(public_request POST /verify "${work_dir}/verify-revoked.json" "${work_dir}/verify-revoked-response.json")"
require_rejection "${revoked_verify_status}" 'acceptance of a revoked invitation' \
  "${work_dir}/verify-revoked-response.json"
revoked_user_id=""

# Avoid retaining an otherwise-unused access token in the shell longer than required.
invite_access_token=""
recovery_access_token=""
password_access_token=""
password_refresh_token=""
second_password_refresh_token=""
echo 'Local Supabase Auth lifecycle passed: signup denied; invite accepted and one-time; disable revoked refresh; recovery changed the password and enabled sign-in; global sign-out revoked all refresh sessions; revoked invite denied.'
