#!/bin/bash

cd contracts/circuits

if [ -f ./powersOfTau28_hez_final_10.ptau ]; then
    echo "powersOfTau28_hez_final_10.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_10.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau
fi

echo "Compiling bonus.circom..."

# compile circuit

circom bonus.circom --r1cs --wasm --sym -o .
snarkjs r1cs info bonus.r1cs

# Start a new zkey and make a contribution

snarkjs groth16 setup bonus.r1cs powersOfTau28_hez_final_10.ptau bonus_circuit_0000.zkey
snarkjs zkey contribute bonus_circuit_0000.zkey bonus_circuit_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey bonus_circuit_final.zkey bonus_verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier bonus_circuit_final.zkey ../bonus_verifier.sol

cd ../..