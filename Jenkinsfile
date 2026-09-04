pipeline {
    agent any
    triggers {
        githubPush()
    }



    environment {
        DOCKER_HUB_USER  = 'tranbao1'
        IMAGE_API        = "${DOCKER_HUB_USER}/devwiki-api"
        IMAGE_WEB        = "${DOCKER_HUB_USER}/devwiki-web"
        DOCKER_TAG       = "v${env.BUILD_ID}"
        DOCKERHUB_CRED   = 'dockerhub-cred'
        NODE_IMAGE       = 'node:20-alpine'
    }

    stages {

 
        stage('Prepare') {
            steps {
                echo "=============================================="
                echo " DevWiki CI/CD Pipeline"  
                echo " Branch   : ${env.GIT_BRANCH}"
                echo " Build ID : ${env.BUILD_ID}"
                echo " Image tag: ${DOCKER_TAG}"
                echo "=============================================="
                sh 'docker system prune -f --filter "until=24h" || true'
            }
        }


        stage('Test: API (NestJS)') {
            steps {
                echo "--- Chạy Unit Test cho devwiki-api ---"
                sh '''
                    docker run --rm \
                      --name devwiki-api-test-${BUILD_ID} \
                      -v "${WORKSPACE}/devwiki-api":/app \
                      -w /app \
                      ${NODE_IMAGE} \
                      sh -c "npm ci && npm test -- --passWithNoTests"
                '''
            }
            post {
                failure {
                    echo "❌ API tests FAILED — dừng pipeline"
                }
            }
        }


        stage('Test: Web (React/Vite)') {
            steps {
                echo "--- Lint & Type-check cho devwiki-web ---"
                sh '''
                    docker run --rm \
                      --name devwiki-web-test-${BUILD_ID} \
                      -v "${WORKSPACE}/devwiki-web":/app \
                      -w /app \
                      ${NODE_IMAGE} \
                      sh -c "npm ci && npm run lint"
                '''
            }
            post {
                failure {
                    echo "❌ Web lint FAILED — dừng pipeline"
                }
            }
        }


        stage('Build: Docker Images') {
            parallel {
                stage('Build: devwiki-api') {
                    steps {
                        echo "--- Build image: ${IMAGE_API}:${DOCKER_TAG} ---"
                        sh '''
                            docker build \
                              -t ${IMAGE_API}:${DOCKER_TAG} \
                              -t ${IMAGE_API}:latest \
                              --label "build.id=${BUILD_ID}" \
                              --label "git.commit=${GIT_COMMIT}" \
                              devwiki-api/
                        '''
                    }
                }
                stage('Build: devwiki-web') {
                    steps {
                        echo "--- Build image: ${IMAGE_WEB}:${DOCKER_TAG} ---"
                        sh '''
                            docker build \
                              -t ${IMAGE_WEB}:${DOCKER_TAG} \
                              -t ${IMAGE_WEB}:latest \
                              --label "build.id=${BUILD_ID}" \
                              --label "git.commit=${GIT_COMMIT}" \
                              devwiki-web/
                        '''
                    }
                }
            }
        }


        stage('Push: Docker Hub') {
            when {
                expression {
                    def branch = env.GIT_BRANCH ?: env.BRANCH_NAME ?: ''
                    return branch == 'main' || branch == 'master' ||
                           branch == 'origin/main' || branch == 'origin/master'
                }
            }
            steps {
                echo "--- Đăng nhập Docker Hub và push images ---"
                withCredentials([
                    usernamePassword(
                        credentialsId: "${DOCKERHUB_CRED}",
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'

                    sh 'docker push ${IMAGE_API}:${DOCKER_TAG}'
                    sh 'docker push ${IMAGE_API}:latest'

                    sh 'docker push ${IMAGE_WEB}:${DOCKER_TAG}'
                    sh 'docker push ${IMAGE_WEB}:latest'
                }
            }
            post {
                success {
                    echo "✅ Push thành công: ${IMAGE_API}:${DOCKER_TAG}, ${IMAGE_WEB}:${DOCKER_TAG}"
                }
                failure {
                    echo "❌ Push FAILED — kiểm tra credential 'dockerhub-cred'"
                }
                always {
                    sh 'docker logout || true'
                }
            }
        }

    } 
    post {
        always {
            echo "--- Dọn dẹp local images ---"
            sh 'docker rmi ${IMAGE_API}:${DOCKER_TAG} || true'
            sh 'docker rmi ${IMAGE_WEB}:${DOCKER_TAG} || true'
            sh 'docker rmi ${IMAGE_API}:latest || true'
            sh 'docker rmi ${IMAGE_WEB}:latest || true'
        }
        success {
            echo "🎉 Pipeline THÀNH CÔNG — Build ${BUILD_ID}"
        }
        failure {
            echo "🔴 Pipeline THẤT BẠI — Build ${BUILD_ID}. Kiểm tra logs bên trên."
        }
        unstable {
            echo "⚠️ Pipeline UNSTABLE — Có test failures."
        }
    }
}
