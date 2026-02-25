<?php
/**
 * Standalone chat API for AIC fee assistant.
 * Calls OpenAI; no Node.js required. Works on typical PHP/WordPress hosts.
 *
 * POST body: { "message": "user question" }
 * Response:  { "reply": "assistant reply" }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['reply' => 'Method not allowed.']);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    echo json_encode(['reply' => 'Server configuration missing. Add api/config.php with OpenAI API key.']);
    exit;
}

$config = require $configFile;
$apiKey = $config['openai_api_key'] ?? '';

if (empty($apiKey) || $apiKey === 'sk-your-openai-api-key-here') {
    http_response_code(500);
    echo json_encode(['reply' => 'OpenAI API key not configured.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$userMessage = trim((string) ($input['message'] ?? ''));

if ($userMessage === '') {
    http_response_code(400);
    echo json_encode(['reply' => 'Please send a non-empty message.']);
    exit;
}

$systemPrompt = "You are a helpful fee and programme assistant for Asian International College (AIC). "
    . "Answer in English or Chinese based on the user's language. "
    . "When discussing fees, give indicative ranges and always state that figures are for reference only and not official; advise users to contact admissions for exact fees.";

$payload = [
    'model' => 'gpt-4o-mini',
    'messages' => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userMessage],
    ],
];

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['reply' => 'Unable to reach OpenAI. Please try again.']);
    exit;
}

$data = json_decode($response, true);
$reply = $data['choices'][0]['message']['content'] ?? '';

if ($httpCode !== 200 || $reply === '') {
    http_response_code(502);
    echo json_encode(['reply' => 'Could not get a reply from the assistant. Please try again.']);
    exit;
}

// Optional: convert markdown-style newlines to <br> for simple HTML display
$reply = nl2br(htmlspecialchars($reply, ENT_QUOTES, 'UTF-8'));

echo json_encode(['reply' => $reply]);
