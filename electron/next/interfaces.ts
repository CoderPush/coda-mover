import { type NextConfig } from 'next'

export interface IElectronNextOptions {
  dirPath: string
  distSubPath: string
  devPort: number
  conf?: NextConfig
}
