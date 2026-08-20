<?php

return [
    'primary_rating_key' => env('RANKED_PRIMARY_RATING_KEY', 'ranked_5v5_ctw'),

    'server_tokens' => [
        'ranked-1' => env('MATCH_SERVER_1_TOKEN'),
        'ranked-2' => env('MATCH_SERVER_2_TOKEN'),
        'ranked-3' => env('MATCH_SERVER_3_TOKEN'),
    ],
];
