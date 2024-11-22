if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

response=$(curl -s -X PUT $host/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json');
token=$(echo $response | jq -r '.token');
curl -X PUT $host/api/auth/chaos/true -H "Authorization: Bearer $token";

sleep 360;

curl -X PUT $host/api/auth/chaos/false -H "Authorization: Bearer $token";
curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null;