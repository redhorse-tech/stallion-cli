//
// file-token-store - implementation of token store that stores the data in
// a JSON encoded file on dist.
//
// This doesn't secure the data in any way, relies on the directory having
// proper security settings.
//

import * as fs from 'fs';
import * as path from 'path';
import * as rx from 'rxjs';
import { map } from 'rxjs/operators';
import { toPairs } from 'lodash';

import { TokenEntry, TokenStore, TokenKeyType, TokenValueType } from '../token-store';

export class FileTokenStore implements TokenStore {
    private filePath: string;
    private tokenStoreCache: { [key: string]: TokenValueType };

    constructor(filePath: string) {
        this.filePath = filePath;
        this.tokenStoreCache = null;
    }

    getStoreFilePath(): string {
        return this.filePath;
    }

    list(): rx.Observable<TokenEntry> {
        this.loadTokenStoreCache();
        return rx
            .from(toPairs(this.tokenStoreCache))
            .pipe(map((pair: [string, TokenValueType]) => ({ key: pair[0], accessToken: pair[1] })));
    }

    get(key: TokenKeyType): Promise<TokenEntry> {
        this.loadTokenStoreCache();
        const token = this.tokenStoreCache[key];
        if (!token) {
            return Promise.resolve(null);
        }
        return Promise.resolve({ key: key, accessToken: token });
    }

    set(key: TokenKeyType, value: TokenValueType): Promise<void> {
        this.loadTokenStoreCache();
        this.tokenStoreCache[key] = value;
        this.writeTokenStoreCache();
        return Promise.resolve();
    }

    remove(key: TokenKeyType): Promise<void> {
        this.loadTokenStoreCache();
        delete this.tokenStoreCache[key];
        this.writeTokenStoreCache();
        return Promise.resolve();
    }

    private loadTokenStoreCache(): void {
        if (this.tokenStoreCache === null) {
            // Ensure directory exists
            try {
                fs.mkdirSync(path.dirname(this.filePath));
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            }
            try {
                this.tokenStoreCache = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
                this.tokenStoreCache = {};
            }
        }
    }

    private writeTokenStoreCache(): void {
        fs.writeFileSync(this.filePath, JSON.stringify(this.tokenStoreCache));
    }
}

export function createFileTokenStore(pathName: string): TokenStore {
    return new FileTokenStore(pathName);
}
