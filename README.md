# api-nft

Tracks NFTs on CENNZnet

# Run NFT Data

1.  run docker-compose up to start mongo service,
2.  run yarn nft:stats
3.  run yarn api
    a. http://localhost:3000/nft/token/56/35/0 - end point to get history of an nft with collection id 56, series id 35 and serialNumber 0
    b. http://localhost:3000/nft/listing/653 - get all information history for a listing id
    c. http://localhost:3000/nft/wallet/5D2XVbob7zYjWzhkZ8nPcBgR7yEhAiXE5rYV8qhKdktrcHSq - get all the nft transaction with a wallet
