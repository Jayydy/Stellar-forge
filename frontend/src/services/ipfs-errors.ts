export class IPFSConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IPFSConfigError'
  }
}

export class IPFSUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IPFSUploadError'
  }
}
