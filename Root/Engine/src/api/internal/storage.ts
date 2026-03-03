import { createAuthRouter } from '../../utils/router'
import { adminAuth } from '../../middlewares/adminAuth'
import { handleStorageUpload } from '../v1/storage'

const internalStorageRoute = createAuthRouter()

// Endpoint interno usado pelo Dashboard para upload de arquivos
// Autenticado via cookie (adminAuth), então a requisição originada do próprio Dashboard 
// pela interface será permitida sem precisar lidar com raw API Keys no frontend.
internalStorageRoute.post('/upload', adminAuth, handleStorageUpload)

export { internalStorageRoute }
