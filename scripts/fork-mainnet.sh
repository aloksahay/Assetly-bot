#!/bin/bash

# Load environment variables from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Fork mainnet using Infura
anvil \
  --fork-url "https://mainnet.infura.io/v3/${INFURA_API_KEY}" \
  --fork-block-number 19000000 \
  --block-time 12 