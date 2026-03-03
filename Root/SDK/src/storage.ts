/**
 * Storage Client
 * Root/SDK/src/storage.ts
 */

export interface StorageFile {
    id: string
    filename: string
    size_bytes: number
    mime_type: string
    public_url: string
    created_at: number
}

export class StorageClient {
    private apiKey: string

    constructor(private readonly baseUrl: string, apiKey: string) {
        this.apiKey = apiKey
    }

    setToken(token: string) {
        this.apiKey = token
    }

    /**
     * Upload a file to your Tenant's private Storage bucket.
     * The file will be available publicly via the returned `public_url`.
     * 
     * @param file The browser `File` object (from an `<input type="file">` or Drag & Drop)
     * @returns The generated file metadata and public URL
     * 
     * @example
     * const fileInput = document.querySelector('input[type="file"]')
     * const file = fileInput.files[0]
     * const { data, error } = await gb.storage.upload(file)
     */
    async upload(file: File): Promise<{ data: StorageFile | null; error: string | null }> {
        if (!(file instanceof File)) {
            return { data: null, error: 'Argument must be a valid File object' }
        }

        try {
            const formData = new FormData()
            formData.append('file', file)

            const url = `${this.baseUrl}/api/v1/storage/upload`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                    // Do NOT set Content-Type manually. Fetch sets it automatically with the boundary for FormData.
                },
                body: formData
            })

            const text = await response.text()
            let result: any
            try {
                result = JSON.parse(text)
            } catch (err) {
                return { data: null, error: `Invalid JSON response from server: ${text.substring(0, 100)}` }
            }

            if (!response.ok) {
                return { data: null, error: result.error || response.statusText }
            }

            return { data: result.data as StorageFile, error: null }

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            return { data: null, error: `Upload request failed: ${msg}` }
        }
    }
}
