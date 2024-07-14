import { Account, AccountAddress, AnyRawTransaction, Aptos, AptosConfig, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk'
import { test } from 'node:test'
import { ReadOnlyClient, WriteOnlyClient } from '.'
import { ECDHWalletExtension, ACESS } from 'acess-js'


test("getValidKeys", async () => {
    const aptosConfig = new AptosConfig({ network: Network.TESTNET })
    const aptos = new Aptos(aptosConfig)
    const roc = new ReadOnlyClient(
        AccountAddress.fromString("0xb60fd39de7a42e40bc1393a72f5212334c178e318248bc85138fc82fc34c8ef6"),
        aptos,
    )
    await roc.fetchKey(AccountAddress.fromString("0xb749ac749cb910e8c13cc39635e5ab8a5e481b5814673eb1b19db6e573c34e89"))
})

// test("createACESS", async() => {
//     const aptosConfig = new AptosConfig({ network: Network.TESTNET })
//     const aptos = new Aptos(aptosConfig)
//     const roc = new ReadOnlyClient(
//         AccountAddress.fromString("0xb60fd39de7a42e40bc1393a72f5212334c178e318248bc85138fc82fc34c8ef6"),
//         aptos,
//     )
//     const acc = Account.fromPrivateKey({
//         privateKey: new Ed25519PrivateKey("")
//     })
//     await roc.createACESS(
//         AccountAddress.fromString("0xb749ac749cb910e8c13cc39635e5ab8a5e481b5814673eb1b19db6e573c34e89"),
//         new ACESS(new ECDHWalletExtension(acc.privateKey.toUint8Array()))
//     )
// })

// test("enroll_key", async () => {
//     const aptosConfig = new AptosConfig({ network: Network.TESTNET })
//     const aptos = new Aptos(aptosConfig)
//     const acc = Account.fromPrivateKey({
//         privateKey: new Ed25519PrivateKey("")
//     })
//     const woc = new WriteOnlyClient(
//         AccountAddress.fromString("0xb60fd39de7a42e40bc1393a72f5212334c178e318248bc85138fc82fc34c8ef6"),
//         aptos,
//         {
//             signTransaction: async (txn: AnyRawTransaction) => {
//                 return acc.signTransactionWithAuthenticator(txn)
//             },
//             accountAddress: acc.accountAddress
//         },
//     )
//     const key = await woc.publishKey({
//         encryptor: new ECIES(new ECDHWalletExtension(acc.privateKey.toUint8Array()))
//     })
//     console.log(key.publicKey().toString())
// })
