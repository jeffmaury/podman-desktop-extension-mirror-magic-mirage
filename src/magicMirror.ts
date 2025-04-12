/**********************************************************************
 * Copyright (C) 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/
import type {
    ExtensionContext,
    RunResult,
    UpdateContainerConnectionEvent,
} from '@podman-desktop/api';
import * as podmanDesktopAPI from '@podman-desktop/api';
import type {PodmanExtensionApi} from '@podman-desktop/podman-extension-api';

const podmanApiDummy = {
    exec: (): Promise<RunResult> => {
        throw Error('Podman extension API is not available.');
    },
};

function getPodmanApi(): PodmanExtensionApi {
    const podmanExports = podmanDesktopAPI.extensions.getExtension<PodmanExtensionApi>('podman-desktop.podman')?.exports;
    return podmanExports ?? podmanApiDummy;
}

const MIRROR_CONFIGURATION_FILE = '/etc/containers/registries.conf.d/998-mirror-hub.conf';

const CONFIGURATION_FILE_CONTENT = `
[[registry]]
location=\\"mirror.gcr.io\\"
prefix=\\"docker.io\\"
`;

export class MagicMirror {
    #podmanApi: PodmanExtensionApi = getPodmanApi();

    constructor(private extensionContext: ExtensionContext) {
    }

    private async isMachineConfigured(name: string) : Promise<boolean> {
        try {
            await this.#podmanApi.exec(['machine', 'ssh', name,'stat', MIRROR_CONFIGURATION_FILE]);
            return true;
        } catch (error: unknown) {
            return false;
        }
    }

    private async configureMachine(name: string): Promise<void> {
        try {
            await this.#podmanApi.exec(['machine', 'ssh', '--username', 'root', name, 'echo', `"${CONFIGURATION_FILE_CONTENT}"`, '>', MIRROR_CONFIGURATION_FILE]);
            await this.#podmanApi.exec(['machine', 'ssh', name, 'systemctl', '--user', 'restart', 'podman.socket']);
            podmanDesktopAPI.window.showNotification({
                title: 'Magic Mirror',
                body: `Configured machine ${name} to use mirror registry`,
                type: 'info',
            });
        } catch (error: unknown) {
            console.log('Failed to configure machine', error);
            podmanDesktopAPI.window.showNotification({
                title: 'Magic Mirror',
                body: `Failed to configure machine ${name} to use mirror registry`,
                type: 'error',
            });
        }
    }

    private async handleMachine(event: UpdateContainerConnectionEvent): Promise<void> {
        console.log('Event received', event.status, event.connection.name);
        if (event.status === 'started' && event.connection.type === 'podman') {
            if (!await this.isMachineConfigured(event.connection.name)) {
                await this.configureMachine(event.connection.name);
            }

        }
    }

    start(): void {
        this.extensionContext.subscriptions.push(podmanDesktopAPI.provider.onDidUpdateContainerConnection(this.handleMachine.bind(this)));
    }

}

