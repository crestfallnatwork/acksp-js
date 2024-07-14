import { Account, AccountAddress, AccountAuthenticator, AnyRawTransaction, Aptos, Ed25519PrivateKey, Ed25519PublicKey, InputViewFunctionData} from "@aptos-labs/ts-sdk";
import { ECDHWalletExtension, ACESS, ACESSSelfLike } from "acess-js";
import { hexToBytes } from 'web3-utils'

const KeyNotFound = new Error("key not found")

type Key = {
    public_key: string,
    encrypted_private_key: string,
    from_timestamp: number,
    to_timestamp: number
}

export class ReadOnlyClient {
    private contractAddress: AccountAddress
    private aptos: Aptos
    constructor(contractAddress: AccountAddress, aptos: Aptos) {
        this.contractAddress = contractAddress
        this.aptos = aptos
    }
    async fetchKeysRaw(address: AccountAddress): Promise<Key[]> {
        const payload: InputViewFunctionData = {
            function: `${this.contractAddress}::acksp::get_keys`,
            functionArguments: [address],
        }
        const ret = await this.aptos.view({ payload })
        const keys = ((ret[0] as any).vec as Key[])
        return keys
    }
    async fetchValidKeyRaw(address: AccountAddress, timestamp: number): Promise<Key> {
        const payload: InputViewFunctionData = {
            function: `${this.contractAddress}::acksp::get_key_timestamp`,
            functionArguments: [address, timestamp],
        }
        const ret = await this.aptos.view({ payload })
        const keys = ((ret[0] as any).vec as Key[])
        if (keys.length === 0) {
            throw KeyNotFound
        }
        return keys[0]
    }
    async fetchAllKeys(address: AccountAddress): Promise<Ed25519PublicKey[]> {
        return (await this.fetchKeysRaw(address)).map((rawKey) => {
            return new Ed25519PublicKey(rawKey.public_key)
        })
    }
    async fetchKey(address: AccountAddress, timestamp?: number): Promise<Ed25519PublicKey> {
        if (timestamp === undefined) {
            timestamp = Date.now()
        }
        return new Ed25519PublicKey((await this.fetchValidKeyRaw(address, timestamp)).public_key)
    }
    async createACESS(address: AccountAddress, encryptor: ACESSSelfLike, timestamp?: number): Promise<ACESS> {
        if (timestamp === undefined) {
            timestamp = Date.now()
        }
        const { encrypted_private_key } = await this.fetchValidKeyRaw(address, timestamp)
        const sk = await encryptor.decryptSelf(hexToBytes(encrypted_private_key))
        return new ACESS(new ECDHWalletExtension(sk))
    }
    async createACESSAll(address: AccountAddress, encryptor: ACESSSelfLike): Promise<ACESS[]> {
        return Promise.all((await this.fetchKeysRaw(address)).map(async (key) => {
            return new ACESS(new ECDHWalletExtension(await encryptor.decryptSelf(
                hexToBytes(key.encrypted_private_key))))
        }))
    }
}

export interface SignerInterface {
    signTransaction(txn: AnyRawTransaction): Promise<AccountAuthenticator>
    accountAddress: AccountAddress
}

export class WriteOnlyClient {
    private contractAddress: AccountAddress
    private signer: SignerInterface
    private aptos: Aptos
    constructor(contractAddress: AccountAddress, aptos: Aptos, signer: SignerInterface) {
        this.contractAddress = contractAddress
        this.signer = signer
        this.aptos = aptos
    }
    async publishKey(config?: { validTill?: number, encryptor?: ACESSSelfLike }): Promise<Ed25519PrivateKey> {
        if (config === undefined) {
            config = {}
        }
        if (config.validTill === undefined) {
            config.validTill = Date.now() + (1 * 12 * 30 * 24 * 60 * 60 * 1000)
        }
        const newKeyPair = Account.generate()
        const pk = newKeyPair.publicKey.toUint8Array()
        let skEnc = new Uint8Array(0)
        if (config.encryptor != undefined) {
            skEnc = await config.encryptor.encryptSelf(newKeyPair.privateKey.toUint8Array())
        }
        const txn = await this.aptos.transaction.build.simple({
            sender: this.signer.accountAddress,
            data: {
                function: `${this.contractAddress}::acksp::add_key`,
                functionArguments: [pk, skEnc, config.validTill]
            }
        })
        const signedTxn = await this.signer.signTransaction(txn)
        const pendingTxn = await this.aptos.transaction.submit.simple({
            transaction: txn,
            senderAuthenticator: signedTxn
        })
        await this.aptos.waitForTransaction({ transactionHash: pendingTxn.hash })
        return newKeyPair.privateKey
    }
}

export class FullClient {
    private roClient: ReadOnlyClient
    private woClient: WriteOnlyClient
    constructor(address: AccountAddress, aptos: Aptos, signer: SignerInterface) {
        this.roClient = new ReadOnlyClient(address, aptos)
        this.woClient = new WriteOnlyClient(address, aptos, signer)
    }
    async fetchKeysRaw(address: AccountAddress): Promise<Key[]> {
        return this.roClient.fetchKeysRaw(address)
    }
    async fetchValidKeyRaw(address: AccountAddress, timestamp: number): Promise<Key> {
        return this.roClient.fetchValidKeyRaw(address, timestamp)
    }
    async fetchAllKeys(address: AccountAddress): Promise<Ed25519PublicKey[]> {
        return this.roClient.fetchAllKeys(address)
    }
    async fetchKey(address: AccountAddress, timestamp?: number): Promise<Ed25519PublicKey> {
        return this.roClient.fetchKey(address, timestamp)
    }
    async createACESS(address: AccountAddress, encryptor: ACESSSelfLike, timestamp?: number): Promise<ACESS> {
        return this.roClient.createACESS(address, encryptor, timestamp)
    }
    async createACESSAll(address: AccountAddress, encryptor: ACESSSelfLike): Promise<ACESS[]> {
        return this.roClient.createACESSAll(address, encryptor)
    }
    async publishKey(config?: { validTill?: number, encryptor?: ACESSSelfLike }): Promise<Ed25519PrivateKey> {
        return this.woClient.publishKey(config)
    }
}
